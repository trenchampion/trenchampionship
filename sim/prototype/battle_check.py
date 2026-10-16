# Zero-sum game value of the SPEC battle formula for a few archetype matchups.
# R = B_stance + 2E + 5*(stance beats opp) ; elements/specials ignored (symmetric).
import itertools, numpy as np
from scipy.optimize import linprog

STANCES = (0, 1, 2)  # 0 Attack, 1 Defense, 2 Counter ; Attack>Defense, Defense>Counter, Counter>Attack
def beats(a, b): return (a == 0 and b == 1) or (a == 1 and b == 2) or (a == 2 and b == 0)
ENERGIES = [e for e in itertools.product(range(11), repeat=3) if sum(e) == 10]
STRATS = [(s, e) for s in itertools.product(STANCES, repeat=3) for e in ENERGIES]

def base(ch, st):
    S, O, Br, F = ch
    return (S + Br // 2, O + F // 2, F + Br // 2)[st]

def payoff_matrix(A, B):
    nA = len(STRATS); M = np.zeros((nA, nA))
    # precompute per round score tables
    for i, (sa, ea) in enumerate(STRATS):
        ra = np.array([base(A, sa[r]) + 2 * ea[r] for r in range(3)])
        for j, (sb, eb) in enumerate(STRATS):
            wins = 0
            for r in range(3):
                RA = ra[r] + (5 if beats(sa[r], sb[r]) else 0)
                RB = base(B, sb[r]) + 2 * eb[r] + (5 if beats(sb[r], sa[r]) else 0)
                if RA > RB: wins += 1
                elif RB > RA: wins -= 1
                else:
                    if A[2] > B[2]: wins += 1
                    elif B[2] > A[2]: wins -= 1
            M[i, j] = 1.0 if wins > 0 else (0.0 if wins < 0 else 0.5)
    return M

def game_value(M):
    # maximize v s.t. M^T x >= v, sum x = 1, x>=0  (row player A)
    n = M.shape[0]
    c = np.zeros(n + 1); c[-1] = -1
    A_ub = np.hstack([-M.T, np.ones((n, 1))]); b_ub = np.zeros(n)
    A_eq = np.hstack([np.ones((1, n)), np.zeros((1, 1))]); b_eq = [1]
    res = linprog(c, A_ub=A_ub, b_ub=b_ub, A_eq=A_eq, b_eq=b_eq, bounds=[(0, None)] * n + [(None, None)], method="highs")
    return -res.fun

# (Strength, Defense, Speed, Focus), budget 40
chars = {
    "Attack-spec (20/1/15/4)": (20, 1, 15, 4),
    "Counter-spec (1/4/15/20)": (1, 4, 15, 20),
    "Defense-spec (1/20/4/15)": (1, 20, 4, 15),
    "Generalist (10/10/10/10)": (10, 10, 10, 10),
    "Hybrid A/C (16/1/8/15)": (16, 1, 8, 15),
}
names = list(chars)
print("Game value (P(win)+0.5 P(draw)) for row vs column, SPEC formula, equal elements, no specials:")
print(" " * 26 + "".join(f"{n[:12]:>14}" for n in names))
for a in names:
    row = []
    for b in names:
        v = game_value(payoff_matrix(chars[a], chars[b]))
        row.append(v)
    print(f"{a:26}" + "".join(f"{v:14.3f}" for v in row))
