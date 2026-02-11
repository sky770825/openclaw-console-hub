import { useState } from "react";

export const C = {
  bg: "#06060a", s1: "#0c0c12", s2: "#13131b", s3: "#1a1a24",
  border: "rgba(255,255,255,0.05)", borderH: "rgba(255,255,255,0.1)",
  t1: "#eeeef2", t2: "#9d9daa", t3: "#5c5c6a",
  indigo: "#818cf8", indigoD: "#6366f1", indigoG: "rgba(99,102,241,0.1)",
  green: "#34d399", greenG: "rgba(52,211,153,0.08)",
  amber: "#fbbf24", amberG: "rgba(251,191,36,0.08)",
  red: "#f87171", redG: "rgba(248,113,113,0.08)",
  cyan: "#22d3ee", cyanG: "rgba(34,211,238,0.08)",
  purple: "#c084fc", purpleG: "rgba(192,132,252,0.08)",
  rose: "#fb7185", roseG: "rgba(251,113,133,0.08)",
};

export const Pulse = ({c=C.green,s=6}) => <span style={{position:"relative",display:"inline-block",width:s,height:s,marginRight:5,flexShrink:0}}>
  <span style={{position:"absolute",inset:0,borderRadius:"50%",background:c,animation:"oc-p 2s ease-in-out infinite"}}/>
  <span style={{position:"absolute",inset:0,borderRadius:"50%",background:c}}/>
</span>;

export const Badge = ({children,c,bg,mono,style={}}) => <span style={{display:"inline-flex",alignItems:"center",padding:"2px 9px",borderRadius:mono?6:99,fontSize:10,fontWeight:650,color:c,background:bg,letterSpacing:mono?0.5:0.2,fontFamily:mono?"'JetBrains Mono',monospace":"inherit",whiteSpace:"nowrap",...style}}>{children}</span>;

export const Ring = ({pct,size=36,stroke=3}) => {
  const r=(size-stroke)/2, ci=2*Math.PI*r, col=pct===100?C.green:pct>50?C.amber:C.indigo;
  return <svg width={size} height={size} style={{transform:"rotate(-90deg)",flexShrink:0}}>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={stroke}/>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={stroke} strokeDasharray={ci} strokeDashoffset={ci-(pct/100)*ci} strokeLinecap="round" style={{transition:"stroke-dashoffset .6s ease"}}/>
  </svg>;
};

export function Btn({children,onClick,v="def",sm,dis,style={},oc}){
  const[h,sH]=useState(false);
  const vs={
    def:{bg:h?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.03)",c:C.t1,b:`1px solid ${C.border}`},
    pri:{bg:h?"#5558e6":C.indigoD,c:"#fff",b:"none"},
    ok:{bg:h?"#1db954":C.green,c:"#fff",b:"none"},
    no:{bg:h?C.redG:"rgba(248,113,113,0.06)",c:C.red,b:`1px solid rgba(248,113,113,0.12)`},
    gh:{bg:"transparent",c:h?C.t1:C.t2,b:"none"},
  };const vv=vs[v];
  return <button data-oc-action={oc} onClick={onClick} disabled={dis} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)}
    style={{background:dis?"rgba(255,255,255,0.01)":vv.bg,color:dis?C.t3:vv.c,border:vv.b,borderRadius:9,padding:sm?"4px 11px":"7px 15px",fontSize:sm?11:12.5,fontWeight:600,cursor:dis?"not-allowed":"pointer",transition:"all .15s",display:"inline-flex",alignItems:"center",gap:5,fontFamily:"inherit",...style}}>{children}</button>;
}

export function Card({children,style={},glow,onClick,oc,...rest}){
  const[h,sH]=useState(false);
  return <div data-oc-action={oc} onClick={onClick} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)}
    style={{background:h?C.s3:C.s2,border:glow?`1px solid ${glow}25`:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px",cursor:onClick?"pointer":"default",transition:"all .2s",boxShadow:glow&&h?`0 0 20px ${glow}10`:"none",...style}} {...rest}>{children}</div>;
}

export function Sec({icon,title,count,right,children}){
  return <div style={{marginBottom:24}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:7}}>
        <span style={{fontSize:15}}>{icon}</span>
        <h2 style={{margin:0,fontSize:14,fontWeight:700,color:C.t1,letterSpacing:-.3}}>{title}</h2>
        {count!==undefined&&<span style={{background:"rgba(255,255,255,0.05)",color:C.t3,fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:99}}>{count}</span>}
      </div>{right}
    </div>{children}
  </div>;
}
