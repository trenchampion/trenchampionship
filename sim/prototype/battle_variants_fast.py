import itertools, sys, numpy as np
from scipy.optimize import linprog
STANCES=(0,1,2)
BEATS=np.array([[0,1,0],[0,0,1],[1,0,0]],dtype=np.int16)  # BEATS[a,b]=1 if a beats b (N>O, O>K, K>N)
ENERGIES=np.array([e for e in itertools.product(range(11),repeat=3) if sum(e)==10],dtype=np.int16)
SST=np.array(list(itertools.product(STANCES,repeat=3)),dtype=np.int16)
# strategies: all (stance seq, energy seq)
S_IDX=np.repeat(np.arange(27),len(ENERGIES)); E_IDX=np.tile(np.arange(len(ENERGIES)),27)
STS=SST[S_IDX]; ENS=ENERGIES[E_IDX]; N=len(STS)

def bases(me,opp,cross):
    S,O,Br,F=me; oS,oO,oBr,oF=opp
    if cross: return np.array([S+Br//2-oO//2, O+F//2-oS//2, F+Br//2-oBr//2],dtype=np.int16)
    return np.array([S+Br//2, O+F//2, F+Br//2],dtype=np.int16)

def payoff(A,B,v):
    bA=bases(A,B,v["cross"]); bB=bases(B,A,v["cross"]); bonus=v["bonus"]; em=v["emult"]
    wins=np.zeros((N,N),dtype=np.int16)
    tb = 1 if A[2]>B[2] else (-1 if B[2]>A[2] else 0)
    for r in range(3):
        sa=STS[:,r]; sb=STS[:,r]
        RA=(bA[sa]+em*ENS[:,r]).astype(np.int16)[:,None] + bonus*BEATS[sa][:,sb]
        RB=(bB[sb]+em*ENS[:,r]).astype(np.int16)[None,:] + bonus*BEATS[sb][:,sa].T
        d=RA-RB
        wins += np.sign(d).astype(np.int16) + (d==0)*tb
    return np.where(wins>0,1.0,np.where(wins<0,0.0,0.5))

def value(M):
    n=M.shape[0]; c=np.zeros(n+1); c[-1]=-1
    res=linprog(c,A_ub=np.hstack([-M.T,np.ones((n,1))]),b_ub=np.zeros(n),
                A_eq=np.hstack([np.ones((1,n)),np.zeros((1,1))]),b_eq=[1],
                bounds=[(0,None)]*n+[(None,None)],method="highs")
    return -res.fun

def archetypes(cap):
    if cap==20:
        return {"A-spec":(20,1,15,4),"C-spec":(1,4,15,20),"D-spec":(1,20,4,15),"Gen":(10,10,10,10),"Hib":(16,1,8,15)}
    return {"A-spec":(15,1,15,9),"C-spec":(1,9,15,15),"D-spec":(1,15,9,15),"Gen":(10,10,10,10),"Hib":(14,2,10,14)}

variants={
 "SPEC (cap20,+5,2E)":dict(cap=20,bonus=5,emult=2,cross=False),
 "A cap15,+5,2E":dict(cap=15,bonus=5,emult=2,cross=False),
 "B cap20,+8,3E":dict(cap=20,bonus=8,emult=3,cross=False),
 "C cap15,+8,3E":dict(cap=15,bonus=8,emult=3,cross=False),
 "D cross,cap20,+5,2E":dict(cap=20,bonus=5,emult=2,cross=True),
 "E cross,cap15,+6,2E":dict(cap=15,bonus=6,emult=2,cross=True),
}
for vn,v in variants.items():
    ch=archetypes(v["cap"]); names=list(ch)
    print(f"\n== {vn} ==   rows vs cols; last col = avg vs others"); sys.stdout.flush()
    print(" "*8+"".join(f"{n:>8}" for n in names)+"     avg")
    for a in names:
        row=[value(payoff(ch[a],ch[b],v)) for b in names]
        avg=sum(r for r,b in zip(row,names) if b!=a)/(len(names)-1)
        print(f"{a:8}"+"".join(f"{r:8.2f}" for r in row)+f"{avg:8.2f}"); sys.stdout.flush()
