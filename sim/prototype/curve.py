# Constant-product launch curve with virtual ETH reserve V and optional virtual token reserve Tv.
# Real tokens T0 = 1e9. k = V * (T0 + Tv). Cumulative ETH in e -> tokens left (incl. virtual) = k/(V+e).
T0 = 1e9
ETHUSD = 3000.0

def state(V, Tv, e):
    k = V * (T0 + Tv)
    tok = k / (V + e)              # token side incl. virtual
    sold = (T0 + Tv) - tok
    price = (V + e) / tok          # ETH per TL (spot)
    return sold, price

def eth_for_share(V, Tv, share):
    # sold = (T0+Tv) * e/(V+e) = share*T0  ->  e = V*s/(1-s), s = share*T0/(T0+Tv)
    s = share * T0 / (T0 + Tv)
    return V * s / (1 - s)

print(f"{'V':>4} {'Tv':>6} | {'founder ETH':>11} {'p_after(ETH)':>13} {'FDV ETH':>8} {'FDV $':>9} | {'sold@200':>8} {'p@200/p_after':>13} | {'e(10x)':>7} {'sellout ETH':>11} {'maxP/p_after':>12}")
for V in (5, 10, 20, 30, 50):
    for Tv in (0, T0/9, T0/4):
        ef = eth_for_share(V, Tv, 0.20)
        sold_f, p_after = state(V, Tv, ef)
        fdv = p_after * T0
        sold200, p200 = state(V, Tv, 200)
        # ETH needed for price to be 10x p_after: price = (V+e)^2/k -> e = sqrt(10*p_after*k) - V
        k = V * (T0 + Tv)
        e10 = (10 * p_after * k) ** 0.5 - V
        if Tv > 0:
            sellout = k / Tv - V
            maxp = (V + sellout) / Tv
            so = f"{sellout:11.1f} {maxp/p_after:12.1f}"
        else:
            so = f"{'inf':>11} {'inf':>12}"
        print(f"{V:4} {Tv/1e6:6.0f}M | {ef:11.2f} {p_after:13.3e} {fdv:8.1f} {fdv*ETHUSD:9.0f} | {sold200/T0*100:7.1f}% {p200/p_after:13.1f} | {e10:7.1f} {so}")

print()
print("Game costs in ETH/USD at p_after (V=30,Tv=0) and at 200 ETH inflow:")
for V, Tv in ((30, 0), (30, T0/9), (10, 0)):
    ef = eth_for_share(V, Tv, 0.20)
    _, p1 = state(V, Tv, ef)
    _, p2 = state(V, Tv, 200)
    for label, tl in (("mint fee 10k TL", 1e4), ("mint fee 2.5k TL", 2.5e3), ("min stake 100 TL", 100), ("max stake 1M TL", 1e6)):
        print(f"V={V} Tv={Tv/1e6:.0f}M {label:18}: after founder {tl*p1:9.5f} ETH (${tl*p1*ETHUSD:8.2f}) | at 200 ETH in {tl*p2:9.5f} ETH (${tl*p2*ETHUSD:8.2f})")
