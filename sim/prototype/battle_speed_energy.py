# Cyclic formula + Speed as energy budget. Rectangular payoff (players may have different energy budgets).
import itertools, sys, numpy as np
from scipy.optimize import linprog
BEATS=np.array([[0,1,0],[0,0,1],[1,0,0]],dtype=np.int16)
SST=np.array(list(itertools.product((0,1,2),repeat=3)),dtype=np.int16)
_cache={}
def strategies(budget):
    if budget not in _cache:
        EN=np.array([e for e in itertools.product(range(budget+1),repeat=3) if sum(e)==budget],dtype=np.int16)
        S_IDX=np.repeat(np.arange(27),len(EN)); E_IDX=np.tile(np.arange(len(EN)),27)
        _cache[budget]=(SST[S_IDX],EN[E_IDX])
    return _cache[budget]
def bases(me):
    S,O,Br,F=me
    return np.array([S+F//2, O+S//2, F+O//2],dtype=np.int16)
def payoff(A,B,v):
    bA=bases(A); bB=bases(B)
    sA,eA=strategies(v["ebud"](A[2])); sB,eB=strategies(v["ebud"](B[2]))
    wins=np.zeros((len(sA),len(sB)),dtype=np.int16)
    tb=1 if A[2]>B[2] else (-1 if B[2]>A[2] else 0)
    for r in range(3):
        sa=sA[:,r]; sb=sB[:,r]
        RA=(bA[sa]+v["emult"]*eA[:,r]).astype(np.int16)[:,None]+v["bonus"]*BEATS[sa][:,sb]
        RB=(bB[sb]+v["emult"]*eB[:,r]).astype(np.int16)[None,:]+v["bonus"]*BEATS[sb][:,sa].T
        d=RA-RB; wins+=np.sign(d).astype(np.int16)+(d==0)*tb
    return np.where(wins>0,1.0,np.where(wins<0,0.0,0.5))
def value(M):
    nA,nB=M.shape; c=np.zeros(nA+1); c[-1]=-1
    res=linprog(c,A_ub=np.hstack([-M.T,np.ones((nB,1))]),b_ub=np.zeros(nB),
                A_eq=np.hstack([np.ones((1,nA)),np.zeros((1,1))]),b_eq=[1],
                bounds=[(0,None)]*nA+[(None,None)],method="highs")
    return -res.fun
# cap 15, budget 40: (Strength, Defense, Speed, Focus)
CH={"A-spec":(15,1,9,15),"C-spec":(1,15,9,15),"D-spec":(15,15,9,1),"Gen":(10,10,10,10),"SlowHib":(13,13,1,13),"FastGen":(9,9,13,9)}
VARIANTS={
 "K cyclic,cap15,+7,2E,E=5+Br/2":dict(bonus=7,emult=2,ebud=lambda br:5+br//2),
 "L cyclic,cap15,+8,2E,E=5+Br/2":dict(bonus=8,emult=2,ebud=lambda br:5+br//2),
 "I cyclic,cap15,+5,2E,E=6+Br/3":dict(bonus=5,emult=2,ebud=lambda br:6+br//3),
 "J cyclic,cap15,+5,2E,E=5+Br/2":dict(bonus=5,emult=2,ebud=lambda br:5+br//2),
}
which=sys.argv[1]
v=VARIANTS[which]; names=list(CH); RES={}
print(f"\n== {which} ==  rows vs cols; last col = avg vs others"); sys.stdout.flush()
print(" "*8+"".join(f"{n:>8}" for n in names)+"     avg")
for ai,a in enumerate(names):
    row=[]
    for bi,b in enumerate(names):
        if bi==ai: r=0.5
        elif bi>ai: r=value(payoff(CH[a],CH[b],v))
        else: r=1-RES[(b,a)]
        RES[(a,b)]=r; row.append(r)
    avg=sum(r for r,b in zip(row,names) if b!=a)/(len(names)-1)
    print(f"{a:8}"+"".join(f"{r:8.2f}" for r in row)+f"{avg:8.2f}"); sys.stdout.flush()
