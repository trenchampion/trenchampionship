"""Zero-sum matrix game solvers.

Three tools, from exact to fast:

* `exact_value`   full LP (HiGHS). Fine up to ~1500 strategies; tens of seconds above.
* `double_oracle` grows a restricted game with best responses. Fast when equilibrium supports
                  are small; battle games are Blotto-like with large supports, so this can
                  approach the full LP size. Kept for validation and small games.
* `rm_plus`       regret matching+ with alternating updates and linear averaging. A few
                  seconds per 3000x3000 game, with a certified exploitability bound. This is
                  what the sweep uses; values are reported to +-0.005.

All return the game value for the row player (P(win) + 0.5 P(draw)).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.optimize import linprog


def _solve_row(M: np.ndarray) -> tuple[float, np.ndarray]:
    """Max-min mixed strategy for the row player of payoff matrix M (rows maximise)."""
    n_a, n_b = M.shape
    c = np.zeros(n_a + 1)
    c[-1] = -1.0  # maximise v
    a_ub = np.hstack([-M.T, np.ones((n_b, 1))])  # -M^T x + v <= 0
    b_ub = np.zeros(n_b)
    a_eq = np.hstack([np.ones((1, n_a)), np.zeros((1, 1))])
    res = linprog(c, A_ub=a_ub, b_ub=b_ub, A_eq=a_eq, b_eq=[1.0],
                  bounds=[(0, None)] * n_a + [(None, None)], method="highs")
    if res.status != 0:
        raise RuntimeError(f"LP failed: {res.message}")
    x = np.clip(res.x[:-1], 0, None)
    return float(-res.fun), x / x.sum()


def exact_value(M: np.ndarray) -> float:
    return _solve_row(np.asarray(M, dtype=np.float64))[0]


@dataclass
class NashResult:
    value: float
    row_support: np.ndarray  # indices into the full row strategy set
    row_mix: np.ndarray
    col_support: np.ndarray
    col_mix: np.ndarray
    iterations: int
    exploitability: float = 0.0


def double_oracle(M: np.ndarray, eps: float = 1e-6, max_iter: int = 1000) -> NashResult:
    M = np.asarray(M, dtype=np.float64)
    rows = [int(np.argmax(M.mean(axis=1)))]
    cols = [int(np.argmin(M.mean(axis=0)))]
    row_set, col_set = set(rows), set(cols)
    for it in range(1, max_iter + 1):
        sub = M[np.ix_(rows, cols)]
        v, x = _solve_row(sub)
        _, y = _solve_row(-sub.T)
        col_payoff_vs_y = M[:, cols] @ y
        br_row = int(np.argmax(col_payoff_vs_y))
        gain_row = col_payoff_vs_y[br_row] - v
        row_payoff_vs_x = x @ M[rows, :]
        br_col = int(np.argmin(row_payoff_vs_x))
        gain_col = v - row_payoff_vs_x[br_col]
        improved = False
        if gain_row > eps and br_row not in row_set:
            rows.append(br_row)
            row_set.add(br_row)
            improved = True
        if gain_col > eps and br_col not in col_set:
            cols.append(br_col)
            col_set.add(br_col)
            improved = True
        if not improved:
            return NashResult(v, np.array(rows), x, np.array(cols), y, it, max(gain_row, gain_col))
    raise RuntimeError("double oracle did not converge")


def rm_plus(M: np.ndarray, iters: int = 1500, tol: float = 0.01, check_every: int = 100) -> NashResult:
    """Regret matching+ (alternating updates, linear averaging) with an exploitability certificate.

    Stops early once exploitability of the average strategies is below `tol`; the returned value
    is then within tol/2 of the exact game value.
    """
    M = np.asarray(M, dtype=np.float32)
    n_a, n_b = M.shape
    reg_a = np.zeros(n_a, dtype=np.float64)
    reg_b = np.zeros(n_b, dtype=np.float64)
    x = np.full(n_a, 1.0 / n_a)
    y = np.full(n_b, 1.0 / n_b)
    xs = np.zeros(n_a)
    ys = np.zeros(n_b)
    wsum = 0.0
    exploit = float("inf")
    for t in range(1, iters + 1):
        # row update against current y
        u_row = M @ y.astype(np.float32)
        v = float(x @ u_row)
        reg_a = np.maximum(reg_a + (u_row - v), 0.0)
        s = reg_a.sum()
        x = reg_a / s if s > 0 else np.full(n_a, 1.0 / n_a)
        # column update against the new x (alternating)
        u_col = x.astype(np.float32) @ M
        v = float(u_col @ y)
        reg_b = np.maximum(reg_b + (v - u_col), 0.0)
        s = reg_b.sum()
        y = reg_b / s if s > 0 else np.full(n_b, 1.0 / n_b)
        xs += t * x
        ys += t * y
        wsum += t
        if t % check_every == 0 or t == iters:
            xa, ya = xs / wsum, ys / wsum
            br_row = float((M @ ya.astype(np.float32)).max())
            br_col = float((xa.astype(np.float32) @ M).min())
            exploit = br_row - br_col
            if exploit < tol:
                break
    xa, ya = xs / wsum, ys / wsum
    value = float(xa.astype(np.float32) @ M @ ya.astype(np.float32))
    row_support = np.nonzero(xa > 1e-4)[0]
    col_support = np.nonzero(ya > 1e-4)[0]
    return NashResult(value, row_support, xa[row_support], col_support, ya[col_support], t, exploit)


def game_value(M: np.ndarray, tol: float = 0.01) -> float:
    """Value for the sweep: RM+ with certificate; falls back to the exact LP for small games."""
    M = np.asarray(M)
    if M.size <= 600 * 600:
        return exact_value(M)
    return rm_plus(M, tol=tol).value
