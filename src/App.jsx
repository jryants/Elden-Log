import { useState, useEffect, useRef, useCallback } from "react";

// ── Firebase ──────────────────────────────────────────────────────────────────
const FB = "https://elden-log-37e7d-default-rtdb.firebaseio.com/game";
const get  = async ()    => { const r = await fetch(`${FB}.json`); const d = await r.json(); return d || {}; };
const put  = async (d)   => fetch(`${FB}.json`, { method:"PUT",   headers:{"Content-Type":"application/json"}, body:JSON.stringify(d) });
const patch= async (d)   => fetch(`${FB}.json`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(d) });

// ── Data ──────────────────────────────────────────────────────────────────────
const EMPTY_PLAYER = () => ({ name:"?", hp:80, hunger:35, fatigue:50, status:[], inventory:[], powers:[], dead:false, class:null, disposition:null });
const EMPTY_STATE  = () => ({ turn:0, scene:"L'histoire n'a pas encore commencé.", outcome_p1:null, outcome_p2:null, action_p1:null, action_p2:null, p1:EMPTY_PLAYER(), p2:EMPTY_PLAYER() });

const CLASSES = [
  { id:"vagabond",    glyph:"⊕", name:"Le Vagabond",          tagline:"Errant des routes sans maison",
    story:"Les routes t'ont tout appris. La méfiance d'abord, l'art de dormir un œil ouvert, de manger ce que la nature refuse aux autres. Tu n'as pas de passé présentable — juste des bottes usées et une cicatrice qui ne parle pas.",
    disposition:"Tu peux devenir éclaireur, survivant, la silhouette qu'on ne remarque jamais avant qu'il soit trop tard.",
    stats:{hp:72,hunger:50,fatigue:60}, status:["Calleux","Méfiant"], inventory:["Manteau rapiécé","Couteau ébréché","3 pièces de cuivre"] },
  { id:"enfant_rues", glyph:"◈", name:"L'Enfant des rues",    tagline:"Pickpocket orphelin, survivant de la ville basse",
    story:"Tu as grandi dans les ruelles de Veth, entre les rats et les marchands corrompus. Les poches des autres étaient ta garde-manger. La ville t'a rattrapé un jour — tu as dû fuir avant que la Main Grise t'attrape.",
    disposition:"Aucun verrou ne te résistera longtemps. Tu peux devenir voleur de l'ombre, informateur, ou fantôme des ruelles.",
    stats:{hp:65,hunger:55,fatigue:45}, status:["Agile","Sous-alimenté"], inventory:["Vêtements volés","Petite lame cachée","5 pièces de cuivre"] },
  { id:"serf",        glyph:"◧", name:"Le Serf affranchi",    tagline:"Esclave libéré, dos brisé, âme intacte",
    story:"Des années aux champs du Nord t'ont donné des mains de pierre et une méfiance profonde des nobles. Ta lettre d'affranchissement est réelle — le monde, lui, ne l'est pas encore.",
    disposition:"Tu peux devenir un rempart, un briseur de chaînes, une force de la nature qui refuse de plier.",
    stats:{hp:80,hunger:40,fatigue:65}, status:["Dos douloureux","Endurci"], inventory:["Vêtements de serf usés","Outil rouillé","Lettre d'affranchissement","2 pièces"] },
  { id:"acolyte",     glyph:"✦", name:"L'Acolyte renégat",    tagline:"Moine fugitif, porteur de secrets interdits",
    story:"Tu as fui l'Ordre de la Flamme Blanche après avoir lu ce que tu n'aurais pas dû lire. Ils te cherchent. Ce que tu sais pourrait allumer une guerre — ou t'acheter une corde.",
    disposition:"Tu peux canaliser des fragments du Vide, soigner ou maudire, lire les âmes comme des livres ouverts.",
    stats:{hp:62,hunger:35,fatigue:40}, status:["Recherché par l'Ordre","Insomniaque"], inventory:["Robe de bure déchirée","Parchemin maudit","Fiole fêlée","6 pièces"] },
  { id:"forgeron",    glyph:"⚒", name:"Le Fils de forgeron",  tagline:"Artisan du métal, héritier d'une dette",
    story:"Ton père est mort d'une dette de jeu. Ses créanciers ont pris l'atelier, les outils — et voulaient te prendre toi en garantie. Tu as pris le premier marteau à portée et tu as couru.",
    disposition:"Tes mains peuvent réparer, fabriquer, améliorer — transformer n'importe quoi en arme redoutable.",
    stats:{hp:78,hunger:42,fatigue:52}, status:["Endetté","Mains calleuses"], inventory:["Tablier de cuir","Marteau de forge","Lime à métal","1 pièce d'argent"] },
  { id:"chasseur",    glyph:"⊛", name:"Le Chasseur des bois", tagline:"Trappeur solitaire, ami des ombres vertes",
    story:"Tu vivais seul en forêt depuis des années, loin des hommes et de leurs guerres. Jusqu'à ce que des soldats brûlent ton camp pour une raison que tu ne comprends toujours pas.",
    disposition:"Tu peux devenir pisteur, archer, empoisonneur naturel — celui qui frappe avant même d'être vu.",
    stats:{hp:70,hunger:38,fatigue:48}, status:["Méfiant des humains","Sens aiguisés"], inventory:["Arc court (corde usée)","3 flèches","Couteau de chasse","Viande séchée"] },
  { id:"charlatan",   glyph:"◎", name:"Le Charlatan",          tagline:"Vendeur de faux miracles, vrai survivant",
    story:"Tu vendais des potions de jouvence — de l'eau colorée et du miel. Ça marchait, jusqu'au jour où un seigneur a failli en mourir. Depuis, chaque ville est une fuite potentielle.",
    disposition:"Tes mots peuvent convaincre, manipuler, tromper. Et peut-être, tes fausses potions deviendront réelles.",
    stats:{hp:60,hunger:45,fatigue:38}, status:["Langue d'argent","Recherché dans 3 villes"], inventory:["Cape trouée","Fioles vides ×4","Dés pipés","8 pièces"] },
  { id:"marin",       glyph:"⊗", name:"Le Marin déserteur",   tagline:"Fugitif des mers, rescapé de corsaires",
    story:"L'équipage du Typhon Noir faisait pire que voler des marchands. Tu as sauté à l'eau par une nuit sans lune, à trois lieues des côtes. Tu as nagé. Tu ne sais pas comment.",
    disposition:"Agile et imprévisible, tu peux devenir duelliste redoutable ou navigateur de l'ombre.",
    stats:{hp:73,hunger:48,fatigue:42}, status:["Traqué par le Typhon","Vêtements séchés sur toi"], inventory:["Cutlass rouillé","Corde (8m)","Boussole cassée","4 pièces"] },
  { id:"fossoyeur",   glyph:"☽", name:"Le Fossoyeur",          tagline:"Gardien des morts, confident des ombres",
    story:"Tu enteres les corps depuis l'âge de douze ans. Les morts ne te font plus peur — c'est les vivants qui t'ont appris la vraie définition de la cruauté.",
    disposition:"Tu peux lire les corps comme des livres, extraire des poisons, et toucher quelque chose de bien plus sombre.",
    stats:{hp:67,hunger:42,fatigue:44}, status:["Odeur de terre froide","Insensible à la mort"], inventory:["Pelle (manche fissuré)","Suaire volé","Huile de conservation","3 pièces"] },
  { id:"apprenti",    glyph:"☿", name:"L'Apprenti brisé",     tagline:"Renvoyé par son maître, porteur de magie instable",
    story:"Ton maître t'a chassé après l'incident. Tes mains brillent encore parfois la nuit. La magie en toi n'est pas éteinte — elle est juste incontrôlée.",
    disposition:"Tu peux devenir sorcier, mais chaque sort risque de se retourner contre toi — jusqu'à ce que tu maîtrises le chaos.",
    stats:{hp:58,hunger:38,fatigue:55}, status:["Magie instable","Marqué par l'Éclat"], inventory:["Robe brûlée","Baguette tronquée","Grimoire incomplet","2 pièces"] },
  { id:"brigand",     glyph:"⊘", name:"Le Brigand repenti",   tagline:"Ancien chef de bande, cherchant l'oubli",
    story:"Tu as dirigé une bande pendant six ans. Puis tu as laissé passer une famille — juste une fois. Ton lieutenant t'a trahi pour la prime.",
    disposition:"Tu sais commander, intimider, frapper en premier. Tu peux rassembler des alliés ou devenir quelque chose de bien plus redoutable.",
    stats:{hp:76,hunger:52,fatigue:50}, status:["Prime sur la tête","Combat sale"], inventory:["Épée courte rouillée","Armure de cuir trouée","Masque de tissu","6 pièces"] },
  { id:"heritier",    glyph:"◇", name:"L'Héritier déchu",     tagline:"Noble sans titre, éduqué pour un monde disparu",
    story:"Ta famille a été massacrée lors de la Purge des Sept Nuits. Tu as survécu caché dans un mur creux. Tu n'avais jamais eu faim avant cette semaine.",
    disposition:"Tu peux devenir diplomate, stratège, espion de haut rang — ou l'architecte d'une vengeance méthodique.",
    stats:{hp:60,hunger:60,fatigue:35}, status:["Bague noble (à cacher)","Traumatisé"], inventory:["Vêtements nobles déguisés","Épée de duel","Lettre falsifiée","12 pièces"] },
  { id:"tisseuse",    glyph:"◉", name:"La Tisseuse d'ombres", tagline:"Informatrice des bas-fonds, tisseuse de secrets",
    story:"Dans les tavernes et maisons closes de Merrac, tu as entendu des confessions de généraux, de marchands, de prêtres. Ce savoir est aussi ta prison.",
    disposition:"Tu peux devenir espionne, maître-chanteuse, la main invisible derrière les trônes.",
    stats:{hp:63,hunger:40,fatigue:38}, status:["Réseau dormant","Visage mémorable"], inventory:["Tenue neutre","Couteau dans la botte","Carnet chiffré","10 pièces"] },
  { id:"mercenaire",  glyph:"⊞", name:"Le Mercenaire fauché", tagline:"Soldat sans contrat, bras à louer sans acheteur",
    story:"Dix ans de batailles pour des seigneurs qui ont perdu. Ton dernier employeur est mort avant de te payer.",
    disposition:"La guerre t'a enseigné plus que n'importe quelle école. Tu peux devenir tacticien, garde du corps légendaire.",
    stats:{hp:77,hunger:55,fatigue:62}, status:["Cicatrices multiples","Impayé"], inventory:["Épée longue ébréchée","Armure incomplète","Pierre à aiguiser"] },
  { id:"herboriste",  glyph:"⚕", name:"L'Herboriste maudit",  tagline:"Guérisseur de village, porteur d'un accident",
    story:"Ton remède a sauvé cent personnes. Il en a tué trois — dont le fils du mayeur. Tu as fui avant le bûcher.",
    disposition:"La connaissance des plantes guérit et tue. Avec du temps, aucun poison ne te sera étranger.",
    stats:{hp:64,hunger:36,fatigue:42}, status:["Recherché pour meurtre","Mains qui tremblent"], inventory:["Sacoche d'herbes vide","Scalpel","Manuel annoté","5 pièces"] },
];

// ── Style tokens ──────────────────────────────────────────────────────────────
const C = { bg:"#0a0808", bg2:"#110e0e", bg3:"#1a1515", gold:"#b8923a", goldBright:"#ebc164", parchment:"#c9b89a", muted:"#9a8f7e", blood:"#8b1a1a", bloodDark:"#1a0505", border:"#2a2020", borderGold:"#4e4637" };
const cinzel = "'Cinzel',serif";
const crimson = "'Crimson Pro',Georgia,serif";

// ── Shared components ─────────────────────────────────────────────────────────
function Rule() {
  return <div style={{ position:"relative", height:1, background:`linear-gradient(90deg,transparent,${C.borderGold},transparent)`, margin:"10px 0" }}><span style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", background:C.bg, padding:"0 6px", fontSize:8, color:C.gold }}>◆</span></div>;
}

function Btn({ children, onClick, gold, blood, disabled, style={} }) {
  const bg = gold ? C.gold : blood ? C.bloodDark : "transparent";
  const border = gold ? C.gold : blood ? C.blood : C.borderGold;
  const color = gold ? "#0a0808" : C.parchment;
  return <button onClick={onClick} disabled={disabled} style={{ fontFamily:cinzel, fontSize:11, letterSpacing:"0.15em", textTransform:"uppercase", padding:"10px 16px", background:disabled?C.bg3:bg, border:`1px solid ${disabled?C.border:border}`, color:disabled?C.muted:color, cursor:disabled?"default":"pointer", width:"100%", marginBottom:8, ...style }}>{children}</button>;
}

function StatBar({ label, value, color }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
      <span style={{ width:50, fontSize:9, letterSpacing:"0.12em", color:C.muted, textTransform:"uppercase", flexShrink:0 }}>{label}</span>
      <div style={{ flex:1, height:5, background:"#1a1515", border:`1px solid ${C.border}` }}>
        <div style={{ height:"100%", width:`${pct}%`, background:pct>70?`linear-gradient(90deg,${color},#ff2222)`:color, transition:"width .4s" }} />
      </div>
      <span style={{ width:22, textAlign:"right", fontSize:10, color:C.muted }}>{Math.round(pct)}</span>
    </div>
  );
}

function CharSheet({ char, isMe }) {
  const ready = char?.class;
  return (
    <div style={{ border:`1px solid ${isMe?C.gold:C.border}`, padding:14, opacity:char?.dead?0.45:1 }}>
      <div style={{ fontFamily:cinzel, fontSize:11, color:isMe?C.goldBright:C.gold, letterSpacing:"0.15em", display:"flex", justifyContent:"space-between", marginBottom:2 }}>
        <span>{ready ? char.name : (isMe?"Toi":"Autre joueur")}</span>
        {char?.dead && <span style={{ color:C.blood }}>☠ MORT</span>}
      </div>
      <div style={{ fontSize:10, color:ready?C.muted:C.borderGold, fontStyle:"italic", marginBottom:4 }}>{ready ? char.class : "En attente..."}</div>
      <Rule />
      {ready ? (
        <>
          <StatBar label="Vie"     value={char.hp}     color={C.blood}  />
          <StatBar label="Faim"    value={char.hunger}  color="#6d3a0f" />
          <StatBar label="Fatigue" value={char.fatigue} color="#4a148c" />
          {char.status?.length > 0 && <div style={{ marginTop:10 }}>{char.status.map((s,i)=><span key={i} style={{ fontSize:9, padding:"2px 6px", background:C.bloodDark, border:`1px solid ${C.blood}`, color:"#ffdad6", display:"inline-block", margin:"2px 2px 2px 0" }}>{s}</span>)}</div>}
          {char.inventory?.length > 0 && (
            <div style={{ marginTop:10 }}>
              <div style={{ fontSize:9, color:C.muted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Sacoche</div>
              {char.inventory.map((item,i)=><div key={i} style={{ display:"flex", alignItems:"center", fontSize:11, color:C.parchment, padding:"3px 0", borderBottom:`1px solid ${C.bg3}` }}><span style={{ display:"inline-block", width:5, height:5, background:C.gold, transform:"rotate(45deg)", marginRight:9, flexShrink:0 }} />{item}</div>)}
            </div>
          )}
          {char.powers?.length > 0 && (
            <div style={{ marginTop:10 }}>
              <div style={{ fontSize:9, color:C.muted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Pouvoirs</div>
              {char.powers.map((p,i)=><div key={i} style={{ fontSize:11, color:C.gold, padding:"3px 0" }}>✦ {p}</div>)}
            </div>
          )}
        </>
      ) : <div style={{ display:"flex", gap:6, paddingTop:4 }}>{[0,1,2].map(i=><span key={i} style={{ width:5, height:5, borderRadius:"50%", background:C.borderGold, display:"inline-block" }} />)}</div>}
    </div>
  );
}

// ── PlayerSelect ──────────────────────────────────────────────────────────────
function PlayerSelect({ onSelect }) {
  const [pnum, setPnum]   = useState(null);
  const [name, setName]   = useState("");
  const [clsId, setClsId] = useState(null);
  const [log, setLog]     = useState("");
  const [saving, setSaving] = useState(false);
  const sel = clsId ? CLASSES.find(c=>c.id===clsId) : null;

  async function confirm() {
    if (!name.trim() || !clsId) return;
    setSaving(true); setLog("Connexion...");
    const c = CLASSES.find(x=>x.id===clsId);
    await patch({ [`p${pnum}`]: { name:name.trim(), class:c.name, classId:c.id, disposition:c.disposition, ...c.stats, status:[...c.status], inventory:[...c.inventory], powers:[], dead:false } });
    setLog("✓ Sauvegardé !");
    setTimeout(()=>onSelect(pnum), 300);
  }

  const inp = { width:"100%", background:"#0f0c0c", border:`1px solid ${C.borderGold}`, color:C.parchment, padding:"11px 14px", fontFamily:crimson, fontSize:16, outline:"none", boxSizing:"border-box" };

  if (!pnum) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32 }}>
      <div style={{ fontFamily:cinzel, fontSize:52, color:C.gold, lineHeight:1, marginBottom:8, filter:"drop-shadow(0 0 15px rgba(184,146,58,0.4))" }}>◉</div>
      <div style={{ fontFamily:cinzel, fontSize:20, color:C.goldBright, letterSpacing:"0.1em", marginBottom:4 }}>ALDEMARR</div>
      <div style={{ fontFamily:crimson, fontSize:13, color:C.muted, fontStyle:"italic", marginBottom:32 }}>Qui es-tu ?</div>
      <div style={{ width:"100%", maxWidth:280 }}>
        {[1,2].map(n=><button key={n} onClick={()=>setPnum(n)} style={{ width:"100%", padding:"14px", marginBottom:10, fontFamily:cinzel, fontSize:12, letterSpacing:"0.2em", textTransform:"uppercase", background:n===1?C.blood:"transparent", border:`1px solid ${n===1?C.blood:C.borderGold}`, color:C.parchment, cursor:"pointer" }}>⚔ Je suis Joueur {n}</button>)}
      </div>
      <div style={{ marginTop:20, fontSize:11, color:C.borderGold, textAlign:"center" }}>Ouvre dans deux onglets — un par joueur.</div>
      <STYLE />
    </div>
  );

  return (
    <div style={{ background:C.bg, minHeight:"100vh", overflowY:"auto", padding:"28px 20px 80px" }}>
      <div style={{ maxWidth:500, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{ fontFamily:cinzel, fontSize:32, color:C.gold, lineHeight:1, marginBottom:6 }}>◉</div>
          <div style={{ fontFamily:cinzel, fontSize:13, color:C.goldBright, letterSpacing:"0.12em" }}>ALDEMARR — JOUEUR {pnum}</div>
        </div>

        <div style={{ fontSize:9, color:C.muted, letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:6 }}>Nom du personnage</div>
        <input style={inp} value={name} onChange={e=>setName(e.target.value)} placeholder="Nom..." autoFocus onKeyDown={e=>e.key==="Enter"&&confirm()} />

        <div style={{ fontSize:9, color:C.muted, letterSpacing:"0.15em", textTransform:"uppercase", margin:"16px 0 8px" }}>Classe</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:5, marginBottom:14 }}>
          {CLASSES.map(c=>(
            <div key={c.id} onClick={()=>setClsId(c.id)} style={{ border:`1px solid ${clsId===c.id?C.gold:C.border}`, background:clsId===c.id?"#160f00":C.bg2, padding:"8px 4px", cursor:"pointer", textAlign:"center" }}>
              <div style={{ fontFamily:cinzel, fontSize:16, color:clsId===c.id?C.gold:C.muted }}>{c.glyph}</div>
              <div style={{ fontSize:7, color:clsId===c.id?C.goldBright:C.parchment, lineHeight:1.3, marginTop:3 }}>{c.name.replace("Le ","").replace("La ","").replace("L'","")}</div>
            </div>
          ))}
        </div>

        {sel && (
          <div style={{ border:`1px solid ${C.gold}`, background:"#0c0900", padding:16, marginBottom:14 }}>
            <div style={{ fontFamily:cinzel, fontSize:13, color:C.goldBright, marginBottom:2 }}>{sel.glyph} {sel.name}</div>
            <div style={{ fontSize:11, color:C.muted, fontStyle:"italic", marginBottom:10 }}>{sel.tagline}</div>
            <Rule />
            <p style={{ fontSize:13, lineHeight:1.85, color:C.parchment, fontFamily:crimson, marginBottom:10 }}>{sel.story}</p>
            <p style={{ fontSize:12, color:C.muted, fontStyle:"italic", fontFamily:crimson, marginBottom:10 }}>Disposition : {sel.disposition}</p>
            <div style={{ display:"flex", gap:12, fontSize:11, marginBottom:8 }}>
              <span style={{ color:"#c0392b" }}>❤ {sel.stats.hp}</span>
              <span style={{ color:"#d35400" }}>Faim {sel.stats.hunger}</span>
              <span style={{ color:"#7d3c98" }}>Fatigue {sel.stats.fatigue}</span>
            </div>
            <div>{sel.status.map((s,i)=><span key={i} style={{ fontSize:9, padding:"2px 6px", background:C.bloodDark, border:`1px solid ${C.blood}`, color:"#ffdad6", display:"inline-block", margin:"2px 2px 2px 0" }}>{s}</span>)}</div>
          </div>
        )}

        {log && <div style={{ fontSize:12, color:log.startsWith("❌")?C.blood:C.gold, marginBottom:8 }}>{log}</div>}
        <Btn onClick={confirm} gold disabled={!name.trim()||!clsId||saving}>{saving?"Sauvegarde...":"✦ Entrer dans Aldemarr"}</Btn>
        <Btn onClick={()=>{setPnum(null);setName("");setClsId(null);setLog("");setSaving(false);}}>← Retour</Btn>
      </div>
      <STYLE />
    </div>
  );
}

// ── Client ────────────────────────────────────────────────────────────────────
function Client({ pnum }) {
  const [sess, setSess]           = useState(null);
  const [action, setAction]       = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied]       = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [jsonInput, setJsonInput]   = useState("");
  const [updateMsg, setUpdateMsg]   = useState("");
  const [synced, setSynced]         = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const pollRef = useRef(null);

  const myKey    = `action_p${pnum}`;
  const otherKey = pnum===1 ? "action_p2" : "action_p1";

  const refresh = useCallback(async () => {
    try {
      const d = await get();
      const s = { ...EMPTY_STATE(), ...d, p1:{ ...EMPTY_PLAYER(), ...d.p1 }, p2:{ ...EMPTY_PLAYER(), ...d.p2 } };
      setSess(s);
      setSynced(new Date());
      if (s[myKey]) setSubmitted(true); else setSubmitted(false);
    } catch(e) { console.error('Firebase error:', e); }
  }, [myKey]);

  useEffect(() => { refresh(); pollRef.current = setInterval(refresh,1500); return ()=>clearInterval(pollRef.current); }, [refresh]);

  const myChar    = pnum===1 ? sess?.p1 : sess?.p2;
  const otherChar = pnum===1 ? sess?.p2 : sess?.p1;
  const myName    = myChar?.class ? myChar.name : `Joueur ${pnum}`;
  const otherName = otherChar?.class ? otherChar.name : `Joueur ${pnum===1?2:1}`;
  const otherReady  = !!otherChar?.class;
  const bothReady   = sess?.action_p1 && sess?.action_p2;

  async function submit() {
    if (!action.trim()||submitted) return;
    await patch({ [myKey]: action.trim() });
    setSubmitted(true); await refresh();
  }

  async function cancel() {
    await patch({ [myKey]: null });
    setSubmitted(false); setAction(""); await refresh();
  }

  async function applyUpdate() {
    if (!jsonInput.trim()) { setUpdateMsg("Colle d'abord le JSON."); return; }
    try {
      const data = JSON.parse(jsonInput.trim());
      const s    = await get();
      const next = { ...s,
        p1:{ ...s.p1, ...(data.p1||{}) },
        p2:{ ...s.p2, ...(data.p2||{}) },
        turn: typeof data.turn==="number" ? data.turn : s.turn,
        scene: data.scene || s.scene,
        outcome_p1: data.outcome_p1 ?? null,
        outcome_p2: data.outcome_p2 ?? null,
        action_p1: null, action_p2: null,
      };
      await put(next);
      await refresh();
      setSubmitted(false); setAction(""); setJsonInput(""); setShowUpdate(false);
      setUpdateMsg(`✦ Tour ${next.turn}`);
      setTimeout(()=>setUpdateMsg(""), 3000);
    } catch(e) { setUpdateMsg("JSON invalide : " + e.message); }
  }

  async function fullReset() {
    await put(EMPTY_STATE());
    setConfirmReset(false); setSubmitted(false); setAction(""); await refresh();
  }

  function buildMsg() {
    if (!sess) return "";
    const n1=sess.p1?.name||"J1", c1=sess.p1?.class?` (${sess.p1.class})`:"";
    const n2=sess.p2?.name||"J2", c2=sess.p2?.class?` (${sess.p2.class})`:"";
    const d1=sess.p1?.disposition?`\nDisposition J1 : ${sess.p1.disposition}`:"";
    const d2=sess.p2?.disposition?`\nDisposition J2 : ${sess.p2.disposition}`:"";
    return `**TOUR ${(sess.turn||0)+1}**\n**${n1}${c1} :** ${sess.action_p1||"—"}\n**${n2}${c2} :** ${sess.action_p2||"—"}${d1}${d2}`;
  }

  function copy() {
    const msg = buildMsg();
    navigator.clipboard?.writeText(msg).catch(()=>{ const el=document.createElement("textarea");el.value=msg;document.body.appendChild(el);el.select();document.execCommand("copy");document.body.removeChild(el); });
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  }

  if (!sess) return <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:cinzel, color:C.gold, fontSize:13, letterSpacing:"0.2em" }}>CONNEXION...</div>;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.parchment, fontFamily:crimson, display:"flex", flexDirection:"column" }}>

      {/* Header */}
      <div style={{ background:"rgba(10,8,8,0.97)", borderBottom:`1px solid ${C.borderGold}`, padding:"10px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, flexShrink:0 }}>
        <div style={{ fontFamily:cinzel, color:C.goldBright, fontSize:13, letterSpacing:"0.15em" }}>◉ ALDEMARR</div>
        <div style={{ fontFamily:cinzel, fontSize:10, color:C.muted }}>TOUR {sess.turn} — {myName.toUpperCase()}</div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:C.muted }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#2ecc71", display:"inline-block" }} />
            {synced?.toLocaleTimeString("fr",{hour:"2-digit",minute:"2-digit",second:"2-digit"})||"—"}
          </div>
          <button onClick={refresh} style={{ background:"transparent", border:`1px solid ${C.borderGold}`, color:C.muted, fontFamily:cinzel, fontSize:10, padding:"4px 8px", cursor:"pointer" }}>↻</button>
          <button onClick={()=>setShowUpdate(v=>!v)} style={{ background:"transparent", border:`1px solid ${C.borderGold}`, color:C.muted, fontFamily:cinzel, fontSize:9, letterSpacing:"0.1em", padding:"4px 8px", cursor:"pointer", textTransform:"uppercase" }}>{showUpdate?"✕ Fermer":"⊕ Narrateur"}</button>
        </div>
      </div>

      {/* Narrator update panel */}
      {showUpdate && (
        <div style={{ background:C.bg2, borderBottom:`1px solid ${C.borderGold}`, padding:"14px 20px", flexShrink:0 }}>
          <textarea value={jsonInput} onChange={e=>setJsonInput(e.target.value)} rows={4}
            placeholder='{"turn":1,"scene":"...","p1":{...},"p2":{...}}'
            style={{ width:"100%", background:"#0f0c0c", border:`1px solid ${C.borderGold}`, color:C.parchment, padding:"8px 12px", fontFamily:crimson, fontSize:12, resize:"vertical", outline:"none", boxSizing:"border-box" }} />
          {updateMsg && <div style={{ fontSize:11, color:updateMsg.startsWith("✦")?C.gold:C.blood, margin:"6px 0" }}>{updateMsg}</div>}
          <Btn onClick={applyUpdate} blood style={{ marginTop:8 }}>↵ Appliquer</Btn>

          {/* Reset button */}
          <div style={{ marginTop:16, borderTop:`1px solid ${C.border}`, paddingTop:14 }}>
            {!confirmReset
              ? <Btn onClick={()=>setConfirmReset(true)} style={{ border:`1px solid ${C.border}`, color:C.muted }}>⟳ Réinitialiser la partie</Btn>
              : <div style={{ border:`1px solid ${C.blood}`, padding:12, background:C.bloodDark }}>
                  <div style={{ fontFamily:cinzel, fontSize:10, color:C.blood, letterSpacing:"0.12em", marginBottom:10 }}>☠ RÉINITIALISER — TOUT SERA PERDU</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    <button onClick={fullReset} style={{ padding:"10px", fontFamily:cinzel, fontSize:10, letterSpacing:"0.12em", background:C.blood, border:`1px solid ${C.blood}`, color:C.parchment, cursor:"pointer" }}>Confirmer</button>
                    <button onClick={()=>setConfirmReset(false)} style={{ padding:"10px", fontFamily:cinzel, fontSize:10, letterSpacing:"0.12em", background:"transparent", border:`1px solid ${C.borderGold}`, color:C.muted, cursor:"pointer" }}>Annuler</button>
                  </div>
                </div>
            }
          </div>
        </div>
      )}

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", padding:20, gap:14, overflowY:"auto" }}>

        {/* Waiting */}
        {!otherReady && (
          <div style={{ border:`1px solid ${C.borderGold}`, background:"#0f0c00", padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:12, color:C.muted, fontStyle:"italic" }}>En attente que Joueur {pnum===1?2:1} crée son personnage...</span>
            <button onClick={refresh} style={{ background:C.gold, border:"none", color:"#0a0808", fontFamily:cinzel, fontSize:9, padding:"5px 10px", cursor:"pointer" }}>↻ SYNC</button>
          </div>
        )}

        {/* Scene */}
        <div style={{ borderLeft:`2px solid ${C.borderGold}`, paddingLeft:14 }}>
          <div style={{ fontSize:9, color:C.muted, letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:6 }}>Scène</div>
          <p style={{ fontSize:14, lineHeight:1.85, color:C.parchment, whiteSpace:"pre-line", fontStyle:"italic" }}>{sess.scene}</p>
          {sess[`outcome_p${pnum}`] && <p style={{ fontSize:13, color:C.muted, marginTop:8 }}>▸ {sess[`outcome_p${pnum}`]}</p>}
        </div>

        <Rule />

        {/* Char sheets */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <CharSheet char={myChar}    isMe={true}  />
          <CharSheet char={otherChar} isMe={false} />
        </div>

        <Rule />

        {/* Both ready → copy message */}
        {bothReady && (
          <div style={{ border:`1px solid ${C.gold}`, background:"#0f0a00", padding:16 }}>
            <div style={{ fontFamily:cinzel, fontSize:10, color:C.gold, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:10 }}>✦ Prêt — Colle dans le chat</div>
            <pre style={{ fontFamily:crimson, fontSize:13, color:C.parchment, whiteSpace:"pre-wrap", lineHeight:1.7, margin:"0 0 12px 0" }}>{buildMsg()}</pre>
            <button onClick={copy} style={{ width:"100%", padding:"12px", fontFamily:cinzel, fontSize:12, letterSpacing:"0.2em", textTransform:"uppercase", background:copied?"#0a3a0a":C.gold, border:`1px solid ${copied?"#2ecc71":C.gold}`, color:copied?"#2ecc71":"#0a0808", cursor:"pointer" }}>
              {copied?"✓ Copié !":"⎘ Copier pour le Narrateur"}
            </button>
          </div>
        )}

        {/* Action input */}
        {!myChar?.dead && !bothReady && (
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, fontSize:11, color:C.muted }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:sess[otherKey]?"#2ecc71":C.borderGold, display:"inline-block", flexShrink:0 }} />
              {sess[otherKey] ? `${otherName} a soumis ✓` : `${otherReady?otherName:`Joueur ${pnum===1?2:1}`} réfléchit...`}
            </div>
            {!submitted
              ? <div style={{ display:"flex", gap:8 }}>
                  <textarea value={action} onChange={e=>setAction(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submit();} }} rows={3}
                    placeholder={`Action de ${myName}...`}
                    style={{ flex:1, background:C.bg3, border:`1px solid ${C.borderGold}`, color:C.parchment, padding:"10px 12px", fontFamily:crimson, fontSize:15, resize:"none", outline:"none", lineHeight:1.5 }} />
                  <button onClick={submit} style={{ width:54, background:C.blood, border:`1px solid #6b1010`, color:C.parchment, fontSize:22, cursor:"pointer", flexShrink:0 }}>↵</button>
                </div>
              : <div style={{ border:`1px solid ${C.borderGold}`, padding:"12px 14px", background:C.bg3 }}>
                  <div style={{ fontSize:11, color:C.gold, marginBottom:6 }}>✦ Action soumise</div>
                  <p style={{ fontSize:14, color:C.parchment, fontStyle:"italic", lineHeight:1.7, margin:"0 0 10px 0" }}>{sess[myKey]}</p>
                  <button onClick={cancel} style={{ fontSize:10, background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:"5px 12px", fontFamily:cinzel, letterSpacing:"0.1em", textTransform:"uppercase", cursor:"pointer" }}>✕ Annuler</button>
                </div>
            }
          </div>
        )}

        {myChar?.dead && (
          <div style={{ textAlign:"center", padding:24, border:`1px solid ${C.blood}`, background:C.bloodDark }}>
            <div style={{ fontFamily:cinzel, color:C.blood, fontSize:32 }}>☠</div>
            <div style={{ fontFamily:cinzel, color:C.blood, fontSize:15, letterSpacing:"0.15em", marginTop:8 }}>{myName} est mort.</div>
          </div>
        )}
      </div>

      <STYLE />
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
function STYLE() {
  return <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Crimson+Pro:ital,wght@0,400;1,400&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    textarea:focus,input:focus{border-color:${C.gold}!important;outline:none}
    textarea::placeholder,input::placeholder{color:${C.borderGold};font-style:italic}
    ::-webkit-scrollbar{width:2px}::-webkit-scrollbar-thumb{background:${C.borderGold}}
  `}</style>;
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [pnum, setPnum] = useState(null);
  return pnum ? <Client pnum={pnum} /> : <PlayerSelect onSelect={setPnum} />;
}
