/* ====================================================================
   index.tsx – PRISM Framework front-end  (one self-contained file)
   ==================================================================== */

const API_ROOT =
  (window as any).__PRISM_API__ ?? "http://127.0.0.1:8000";

/* ------------- React / library imports ---------------------------- */
import React, {
  useState, useEffect, useMemo, ReactNode
} from "react";
import ReactDOM from "react-dom/client";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer
} from "recharts";
import {
  Save, Eye, Users, Brain, Heart, Shield, Lightbulb,
  Sparkles, ChevronsRight, ArrowLeft, PlusCircle,
  ServerCrash, RefreshCw
} from "lucide-react";

/* ------------- Static data (unchanged from your draft) ------------ */
const aleFeaturesData = [
  { feature:"Authentic Tasks", components:[
      "Scenario-based challenges with ill-defined problems",
      "Dynamic data feeds reflecting real-time changes",
      "Resource management systems with constraints",
      "Unexpected event triggers or \"wild cards\"",
      "Systems modeling conflicting goals or stakeholder needs",
      "Information displays with asymmetry or \"fog-of-war\""
  ]},
  { feature:"Multiple Perspectives", components:[
      "Multiplayer modes (co-op/competitive)",
      "AI agents with distinct goals, biases, or personalities",
      "Branching narrative structures",
      "Access to diverse in-game information sources"
  ]},
  { feature:"Collaboration & Social Dialogue", components:[
      "Integrated text or voice chat systems",
      "Sophisticated NPC dialogue with meaningful choices",
      "Shared task interfaces or objectives",
      "In-game forums or knowledge-sharing channels"
  ]},
  { feature:"Reflection & Articulation", components:[
      "In-game journaling tools or \"captain's logs\"",
      "Guided reflection prompts after key events",
      "Action replay or review systems",
      "Game mechanics requiring players to justify choices"
  ]},
  { feature:"Scaffolding & Coaching", components:[
      "Introductory tutorial levels or guided practice",
      "Adaptive hint systems based on player performance",
      "In-game AI mentors or characters offering advice",
      "Progressively increasing difficulty and complexity"
  ]},
  { feature:"Authentic Context", components:[
      "Rich narrative backstories and world-building",
      "Realistic environmental design (visual, auditory, haptic)",
      "Game rules mirroring real-world limitations",
      "Culturally relevant scenarios, characters, dilemmas"
  ]}
];

const skiveGameApproachesData = [
  { aspect:"Skills (Cognitive)", approaches:[
      "Puzzle mechanics requiring logical deduction",
      "Data-interpretation interfaces and mini-games",
      "Systems demanding pattern recognition",
      "Complex decision-tree navigation",
      "Investigative tasks with clues and red herrings",
      "Simulations requiring strategic planning"
  ]},
  { aspect:"Skills (Interpersonal)", approaches:[
      "Dialogue systems with nuanced emotional responses",
      "Negotiation mechanics with AI or human players",
      "Team-based objectives requiring shared understanding",
      "Role-playing scenarios for conflict resolution"
  ]},
  { aspect:"Skills (Psychomotor)", approaches:[
      "Physics-based interaction mechanics for tool use",
      "Direct manipulation controls requiring dexterity",
      "Simulations of physical procedures",
      "Tasks emphasizing precise timing and coordination"
  ]},
  { aspect:"Knowledge", approaches:[
      "In-game encyclopedias / manuals / knowledge bases",
      "Interactive tutorials demonstrating concepts",
      "Scenarios requiring direct application of theories",
      "Feedback systems that correct misconceptions"
  ]},
  { aspect:"Identity", approaches:[
      "Avatar customisation reflecting professional roles",
      "Narrative choices that shape professional identity",
      "NPCs who recognise & respond to the player's role",
      "Opportunities to take on leadership or specialist roles"
  ]},
  { aspect:"Values & Ethics", approaches:[
      "Moral / ethical dilemma scenarios in the narrative",
      "Branching storylines with value-laden consequences",
      "Systems tracking reputation / trust / ethical standing",
      "Reflective prompts on ethical considerations"
  ]}
];

const archetypes = [
  { name:"Analytical Strategist",
    description:"Data-driven decision maker with strong analytical and strategic thinking capabilities",
    dominant:["Skills-Cognitive","Knowledge-Conceptual"],
    supporting:["Identity-Problem Solver","Values-Objectivity"],
    examples:["Management Consultant","Financial Analyst","Research Director"] },
  { name:"Empathetic People Leader",
    description:"Human-centered leader focused on team development and collaborative success",
    dominant:["Skills-Interpersonal","Identity-Mentor","Values-Team Wellbeing"],
    supporting:["Knowledge-Organisational","Ethics-Relational"],
    examples:["Team Manager","HR Leader","Executive Coach"] },
  { name:"Technical Virtuoso",
    description:"Domain expert with deep technical skills and precision-focused approach",
    dominant:["Skills-Psychomotor","Knowledge-Procedural"],
    supporting:["Identity-Specialist","Values-Mastery"],
    examples:["Master Surgeon","Elite Programmer","Research Scientist"] },
  { name:"Ethical Guardian",
    description:"Principles-driven professional focused on integrity and moral reasoning",
    dominant:["Ethics-All","Values-Integrity","Knowledge-Regulatory"],
    supporting:["Skills-Critical Evaluation","Skills-Communication"],
    examples:["Judge","Compliance Officer","Ethics Consultant"] }
];

/* ------------- Type declarations ------------------------------ */
interface RoleData { profession:string; specificRole:string; description:string; }
interface SkiveRatings {
  skills:{ cognitive:Record<string,number>; interpersonal:Record<string,number>;
           psychomotor:Record<string,number>; metacognitive:Record<string,number>; };
  knowledge:{ declarative:Record<string,number>; procedural:Record<string,number>;
              conditional:Record<string,number>; };
  identity:Record<string,number>;
  values:Record<string,number>;
  ethics:Record<string,number>;
}
interface AleDesign {
  learningObjectives:Record<string,string>;
  selectedAleComponents:Record<string,string[]>;
  selectedSkiveApproaches:Record<string,string[]>;
}
interface Profile {
  id:number|null;
  roleData:RoleData;
  skiveRatings:SkiveRatings;
  aleDesign:AleDesign;
  archetype:string|null;
}
interface SavedSummary {
  id:number; specific_role:string; profession:string;
  updated_at:string; archetype:string|null;
}

/* ------------- Helpers ---------------------------------------- */
const getInitialProfile = ():Profile => ({
  id:null,
  roleData:{ profession:"", specificRole:"", description:"" },
  skiveRatings:{
    skills:{
      cognitive   :{ analytical:1, decisionMaking:1, strategicPlanning:1, criticalEvaluation:1 },
      interpersonal:{ communication:1, collaboration:1, empathy:1, negotiation:1 },
      psychomotor :{ precision:1, proceduralExecution:1, coordination:1 },
      metacognitive:{ reflection:1, adaptability:1, selfRegulation:1 }
    },
    knowledge:{
      declarative :{ conceptual:1, factual:1, theoretical:1 },
      procedural  :{ methods:1, processes:1, techniques:1 },
      conditional :{ whenToApply:1, contextualUse:1 }
    },
    identity:{ professionalRole:1, communityBelonging:1, selfEfficacy:1, dispositions:1 },
    values  :{ coreValues:1, epistemicValues:1, stakeholderValues:1 },
    ethics  :{ deontological:1, consequentialist:1, virtue:1 }
  },
  aleDesign:{ learningObjectives:{}, selectedAleComponents:{}, selectedSkiveApproaches:{} },
  archetype:null
});

/* =================================================================
   Stage 1 component  ▸  ROLE PROFILER
   ================================================================= */
function RoleProfiler(
  { profile, onProfileChange, onComplete, onSave, saveStatus }:{
    profile:Profile;
    onProfileChange:(u:(p:Profile)=>Profile)=>void;
    onComplete:()=>void;
    onSave:()=>Promise<void>;
    saveStatus:{ loading:boolean; message:string; isError:boolean };
  }
){
  const steps = ["Role","Skills","Knowledge","Identity","Values","Ethics","Summary"];
  const [step,setStep] = useState(0);

  /* ---------- slider helpers ---------- */
  type RatingNode = number|Record<string,RatingNode>;
  const avg = (o:RatingNode):number =>
    typeof o==="number" ? o :
    Object.values(o).reduce((s,v)=>s+avg(v),0) / Math.max(1,Object.values(o).length);

  const radarData = Object.entries(profile.skiveRatings).map(([k,v])=>({
    subject:k.charAt(0).toUpperCase()+k.slice(1),
    A:avg(v), fullMark:3
  }));

  const setRating = (path:string[], val:number)=>{
    onProfileChange(p=>{
      const clone = structuredClone(p.skiveRatings) as any;
      let cur = clone;
      for(let i=0;i<path.length-1;i++) cur = cur[path[i]];
      cur[path.at(-1)!] = val;
      return { ...p, skiveRatings:clone };
    });
  };

  /* ---------- JSX per step ---------- */
  function page(){
    /* --- step 0: role info --- */
    if(step===0) return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Role Definition</h3>

        <label className="block">
          <span className="text-sm font-medium">Target Profession</span>
          <input value={profile.roleData.profession}
                 onChange={e=>onProfileChange(p=>({...p,roleData:{...p.roleData,profession:e.target.value}}))}
                 className="w-full p-3 mt-1 border rounded"/>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Specific Role</span>
          <input value={profile.roleData.specificRole}
                 onChange={e=>onProfileChange(p=>({...p,roleData:{...p.roleData,specificRole:e.target.value}}))}
                 className="w-full p-3 mt-1 border rounded"/>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Role Description</span>
          <textarea rows={4}
                    value={profile.roleData.description}
                    onChange={e=>onProfileChange(p=>({...p,roleData:{...p.roleData,description:e.target.value}}))}
                    className="w-full p-3 mt-1 border rounded"/>
        </label>
      </div>
    );

    /* --- step 1-5: sliders --- */
    if(step>=1 && step<=5){
      const section = Object.keys(profile.skiveRatings)[step-1] as keyof SkiveRatings;
      const sectionObj:any = profile.skiveRatings[section];

      const entries:[string,string,number,string[]][] = []; // label, key, value, path
      const traverse = (obj:any, path:string[])=>{
        Object.entries(obj).forEach(([k,v])=>{
          if(typeof v==="number") entries.push([
            k.replace(/([A-Z])/g," $1").replace(/^./,s=>s.toUpperCase()),
            k, v, [...path,k]
          ]);
          else traverse(v as any,[...path,k]);
        });
      };
      traverse(sectionObj,[section]);

      return (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold capitalize">{section} Assessment</h3>
          {entries.map(([label,key,val,path])=>(
            <div key={key} className="p-4 bg-white border rounded">
              <div className="flex justify-between mb-2">
                <h4 className="font-medium">{label}</h4>
                <span className="text-sm">{val===1?"Low":val===2?"Medium":"High"}</span>
              </div>
              <input type="range" min={1} max={3} value={val}
                     onChange={e=>setRating(path,parseInt(e.target.value))}
                     className="w-full"/>
            </div>
          ))}
        </div>
      );
    }

    /* --- step 6: summary page --- */
    return (
      <div className="space-y-6">
        <div className="flex items-center mb-4">
          <Eye className="text-indigo-600 mr-2"/> <h3 className="text-lg font-semibold">Summary</h3>
        </div>

        <div className="p-6 bg-gray-100 rounded">
          <h4 className="font-semibold">
            {profile.roleData.specificRole||"Untitled Role"}
          </h4>
          <p className="text-gray-600">{profile.roleData.profession}</p>
          <p className="text-sm mt-2">{profile.roleData.description}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 border rounded">
            <h4 className="font-semibold text-center mb-4">SKIVE Radar</h4>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid/>
                <PolarAngleAxis dataKey="subject"/>
                <PolarRadiusAxis angle={90} domain={[0,3]} tick={false}/>
                <Radar dataKey="A" stroke="#2563eb" fill="#2563eb" fillOpacity={.4}/>
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Archetype Match</h4>
            {archetypes.map(a=>(
              <div key={a.name}
                   onClick={()=>onProfileChange(p=>({...p,archetype:p.archetype===a.name?null:a.name}))}
                   className={`p-3 mb-2 border rounded cursor-pointer
                               ${profile.archetype===a.name
                                  ?"border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                                  :"hover:bg-gray-50"}`}>
                <h5 className="font-medium">{a.name}</h5>
                <p className="text-sm text-gray-600">{a.description}</p>
                {profile.archetype===a.name&&
                  <p className="mt-1 text-xs"><b>Examples:</b> {a.examples.join(", ")}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
          <button onClick={onSave}
                  disabled={saveStatus.loading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded
                             hover:bg-green-700 disabled:opacity-50">
            <Save size={16}/> {saveStatus.loading?"Saving…":"Save Profile"}
          </button>
          {saveStatus.message &&
            <span className={`text-sm font-medium
                              ${saveStatus.isError?"text-red-600":"text-green-600"}`}>
              {saveStatus.message}
            </span>}
        </div>
      </div>
    );
  }

  /* ---------- layout wrapper ---------- */
  return (
    <>
      <div className="px-6 py-5 border-b">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Stage 1: SKIVE Role Profiling</h2>
          <span className="text-sm font-medium text-blue-600">
            Step {step+1} / {steps.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full transition-all"
               style={{ width:`${(step)/(steps.length-1)*100}%` }}/>
        </div>
      </div>

      <div className="p-6 bg-gray-50">{page()}</div>

      <div className="px-6 py-4 border-t flex justify-between bg-white">
        <button onClick={()=>setStep(Math.max(0,step-1))}
                disabled={step===0}
                className="px-6 py-2 border rounded disabled:opacity-50">Previous</button>
        {step===steps.length-1
          ? <button onClick={onComplete}
                    className="px-6 py-2 bg-green-600 text-white rounded
                               flex items-center gap-2 hover:bg-green-700">
              Proceed <ChevronsRight size={18}/>
            </button>
          : <button onClick={()=>setStep(Math.min(steps.length-1,step+1))}
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Next
            </button>}
      </div>
    </>
  );
}

/* =================================================================
   Stage 2 component ▸  ALE DESIGNER  (shortened but fully functional)
   ================================================================= */
function ALEDesigner(
  { profile, onProfileChange, onBack, onSave, saveStatus }:{
    profile:Profile;
    onProfileChange:(u:(p:Profile)=>Profile)=>void;
    onBack:()=>void;
    onSave:()=>Promise<void>;
    saveStatus:{ loading:boolean; message:string; isError:boolean };
  }
){
  const [ai,setAI] = useState<Record<string,{loading:boolean; err:string|null}>>({});

  /* ----- derive list of competencies rated >1 ----- */
  const competencies = useMemo(()=>{
    const list:{ id:string; name:string; category:string; value:number }[] = [];
    const walk=(obj:any,path:string[],cat:string)=>{
      Object.entries(obj).forEach(([k,v])=>{
        if(typeof v==="number"){ if(v>1)
          list.push({
            id:[...path,k].join("-"),
            name:k.replace(/([A-Z])/g," $1").replace(/^./,s=>s.toUpperCase()),
            category:cat, value:v
          });
        }else walk(v as any,[...path,k],cat);
      });
    };
    Object.entries(profile.skiveRatings).forEach(([cat,v])=>walk(v as any,[cat],cat));
    return list.sort((a,b)=>b.value-a.value);
  },[profile.skiveRatings]);

  /* ----- AI objective suggestion (optional) ----- */
  const suggest = async (c:{id:string;name:string;category:string})=>{
    setAI(p=>({...p,[c.id]:{loading:true,err:null}}));
    try{
      const res = await fetch(`${API_ROOT}/api/generate-objective`,{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          prompt:`Generate one concise SMART objective for the competency "${c.name}" `
               +`within the SKIVE dimension "${c.category}".`
        })
      });
      if(!res.ok) throw new Error("AI server "+res.status);
      const {text} = await res.json();
      onProfileChange(p=>({
        ...p,
        aleDesign:{
          ...p.aleDesign,
          learningObjectives:{ ...p.aleDesign.learningObjectives, [c.id]:text }
        }
      }));
    }catch(e){
      setAI(p=>({...p,[c.id]:{loading:false,err:(e as Error).message}}));
    }finally{
      setAI(p=>({...p,[c.id]:{...p[c.id],loading:false}}));
    }
  };

  /* ----- helper to toggle checkbox selections ----- */
  const toggle = (
    group:"selectedAleComponents"|"selectedSkiveApproaches",
    key:string, value:string, checked:boolean
  )=>{
    onProfileChange(p=>{
      const set = new Set(p.aleDesign[group][key] ?? []);
      checked? set.add(value) : set.delete(value);
      return {
        ...p,
        aleDesign:{
          ...p.aleDesign,
          [group]:{ ...p.aleDesign[group], [key]:Array.from(set) }
        }
      };
    });
  };

  /* ----- JSX ----- */
  return (
    <>
      <div className="px-6 py-5 border-b">
        <h2 className="text-lg font-semibold">Stage 2: ALE Designer</h2>
        <p className="text-sm text-gray-600">
          Map the profile into a learning-game design.
        </p>
      </div>

      <div className="p-6 space-y-8 bg-gray-50">

        {/* 1. competencies → objectives */}
        <section>
          <h3 className="text-xl font-semibold border-b pb-2 mb-4">
            1. Prioritised Competencies & Objectives
          </h3>

          {competencies.length===0 &&
            <p className="text-center text-gray-500">
              No competency rated Medium/High.
            </p>}

          {competencies.map(c=>(
            <div key={c.id} className="p-4 bg-white border rounded mb-3">
              <div className="flex justify-between">
                <div>
                  <div className="text-xs uppercase text-gray-500">
                    {c.category}
                  </div>
                  <h4 className="font-semibold">{c.name}</h4>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-sm font-semibold
                                  ${c.value===3
                                     ?"bg-blue-100 text-blue-800"
                                     :"bg-yellow-100 text-yellow-800"}`}>
                  {c.value===3?"High":"Medium"}
                </span>
              </div>

              <textarea
                rows={2}
                value={profile.aleDesign.learningObjectives[c.id]||""}
                onChange={e=>onProfileChange(p=>({
                  ...p,
                  aleDesign:{
                    ...p.aleDesign,
                    learningObjectives:{
                      ...p.aleDesign.learningObjectives,
                      [c.id]:e.target.value
                    }
                  }
                }))}
                placeholder="Define a SMART learning objective…"
                className="w-full p-2 mt-3 border rounded"/>

              <div className="flex justify-end mt-2">
                {ai[c.id]?.err && <span className="text-xs text-red-500 mr-3">{ai[c.id]!.err}</span>}
                <button onClick={()=>suggest(c)}
                        disabled={ai[c.id]?.loading}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm
                                   bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100">
                  <Sparkles size={14}/>
                  {ai[c.id]?.loading?"Generating…":"Suggest"}
                </button>
              </div>
            </div>
          ))}
        </section>

        {/* 2. ALE feature checkboxes */}
        <section>
          <h3 className="text-xl font-semibold border-b pb-2 mb-4">
            2. Authentic-Learning Features
          </h3>
          {aleFeaturesData.map(f=>(
            <details key={f.feature} className="border rounded mb-3 bg-white p-4" open>
              <summary className="font-semibold cursor-pointer">
                {f.feature}
              </summary>
              <div className="grid md:grid-cols-2 gap-3 mt-3">
                {f.components.map(c=>(
                  <label key={c} className="flex items-center gap-3">
                    <input type="checkbox"
                           checked={profile.aleDesign.selectedAleComponents?.[f.feature]?.includes(c)||false}
                           onChange={e=>toggle("selectedAleComponents",f.feature,c,e.target.checked)}
                           className="h-4 w-4"/>
                    <span className="text-sm">{c}</span>
                  </label>
                ))}
              </div>
            </details>
          ))}
        </section>

        {/* 3. SKIVE → game approaches */}
        <section>
          <h3 className="text-xl font-semibold border-b pb-2 mb-4">
            3. SKIVE-Aligned Game Approaches
          </h3>
          {skiveGameApproachesData.map(a=>(
            <details key={a.aspect} className="border rounded mb-3 bg-white p-4" open>
              <summary className="font-semibold cursor-pointer">
                {a.aspect}
              </summary>
              <div className="grid md:grid-cols-2 gap-3 mt-3">
                {a.approaches.map(ap=>(
                  <label key={ap} className="flex items-center gap-3">
                    <input type="checkbox"
                           checked={profile.aleDesign.selectedSkiveApproaches?.[a.aspect]?.includes(ap)||false}
                           onChange={e=>toggle("selectedSkiveApproaches",a.aspect,ap,e.target.checked)}
                           className="h-4 w-4"/>
                    <span className="text-sm">{ap}</span>
                  </label>
                ))}
              </div>
            </details>
          ))}
        </section>
      </div>

      <div className="px-6 py-4 border-t flex justify-between bg-white">
        <button onClick={onBack}
                className="flex items-center gap-2 px-6 py-2 border rounded">
          <ArrowLeft size={18}/> Back
        </button>

        <div className="flex items-center gap-4">
          {saveStatus.message &&
            <span className={`text-sm font-medium
                              ${saveStatus.isError?"text-red-600":"text-green-600"}`}>
              {saveStatus.message}
            </span>}
          <button onClick={onSave}
                  disabled={saveStatus.loading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded
                             hover:bg-green-700 disabled:opacity-50">
            <Save size={16}/> {saveStatus.loading?"Saving…":"Save Design"}
          </button>
        </div>
      </div>
    </>
  );
}

/* =================================================================
   PrismApp ▸ stage switcher
   ================================================================= */
function PrismApp({ profile:initial, onExit }:{
  profile:Profile; onExit:()=>void;
}){
  const [stage,setStage]       = useState<"profiling"|"designing">("profiling");
  const [profile,setProfile]   = useState<Profile>(initial);
  const [saveInfo,setSaveInfo] = useState({ loading:false, message:"", isError:false });

  const updateProfile = (fn:(p:Profile)=>Profile)=>{
    setProfile(fn);
    if(saveInfo.message) setSaveInfo({ loading:false, message:"", isError:false });
  };

  /* POST save to API */
  const saveProfile = async ()=>{
    setSaveInfo({ loading:true, message:"", isError:false });
    try{
      const res = await fetch(`${API_ROOT}/api/profiles`,{
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ ...profile, id:profile.id??null })
      });
      if(!res.ok) throw new Error("Save "+res.status);
      const data = await res.json();
      setProfile(p=>({ ...p, id:data.id }));
      setSaveInfo({ loading:false, message:data.message||"Saved!", isError:false });
    }catch(e){
      setSaveInfo({ loading:false, message:(e as Error).message, isError:true });
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <button onClick={onExit}
              className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900">
        <ArrowLeft size={16}/> Back to Dashboard
      </button>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <header className="px-6 py-4 border-b bg-gray-50">
          <h1 className="text-2xl font-bold">PRISM Framework</h1>
          <p className="text-gray-600">
            Professional Role Identity &amp; SKIVE-Mapped Environments
          </p>
        </header>

        {stage==="profiling"
          ? <RoleProfiler
              profile={profile}
              onProfileChange={updateProfile}
              onComplete={()=>setStage("designing")}
              onSave ={saveProfile}
              saveStatus={saveInfo}/>
          : <ALEDesigner
              profile={profile}
              onProfileChange={updateProfile}
              onBack ={()=>setStage("profiling")}
              onSave ={saveProfile}
              saveStatus={saveInfo}/>}
      </div>
    </div>
  );
}

/* =================================================================
   ProfileLoader  +  AppContainer
   ================================================================= */
function ProfileLoader({ onSelectProfile }:{
  onSelectProfile:(p:Profile)=>void;
}){
  const [list,setList] = useState<SavedSummary[]>([]);
  const [state,setState] = useState<{loading:boolean; err:string|null}>
                            ({ loading:true, err:null });

  const loadAll = async ()=>{
    setState({ loading:true, err:null });
    try{
      const res = await fetch(`${API_ROOT}/api/profiles`);
      if(!res.ok) throw new Error("Server "+res.status);
      setList(await res.json());
    }catch(e){
      setState({ loading:false, err:(e as Error).message });
    }finally{
      setState(s=>({ ...s, loading:false }));
    }
  };
  useEffect(()=>{ loadAll(); },[]);

  const loadOne = async (id:number)=>{
    setState({ loading:true, err:null });
    try{
      const res = await fetch(`${API_ROOT}/api/profiles/${id}`);
      if(!res.ok) throw new Error("Load "+res.status);
      onSelectProfile(await res.json());
    }catch(e){
      setState({ loading:false, err:(e as Error).message });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <header className="p-6 border-b">
          <h1 className="text-2xl font-bold">PRISM Profile Dashboard</h1>
          <p className="text-gray-600">Select a profile or create a new one.</p>
        </header>

        <main className="p-6">
          <button
            onClick={()=>onSelectProfile(getInitialProfile())}
            className="w-full flex items-center justify-center gap-2 mb-6 px-4 py-3
                       bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">
            <PlusCircle size={20}/> Create New Profile
          </button>

          {state.loading && <p className="text-center">Loading…</p>}
          {state.err && (
            <div className="py-6 text-center bg-red-50 border border-red-200 rounded">
              <ServerCrash className="mx-auto text-red-500 mb-2" size={32}/>
              <p className="text-red-700 font-semibold mb-3">{state.err}</p>
              <button onClick={loadAll}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200">
                <RefreshCw size={14}/> Retry
              </button>
            </div>
          )}

          {(!state.loading && !state.err) && (
            list.length===0
              ? <p className="text-center text-gray-500">No saved profiles.</p>
              : <ul className="space-y-3">
                  {list.map(p=>(
                    <li key={p.id}
                        onClick={()=>loadOne(p.id)}
                        className="flex justify-between items-center p-4 bg-gray-50
                                   border rounded-lg hover:bg-blue-50 cursor-pointer">
                      <div>
                        <p className="font-semibold text-blue-800">
                          {p.specific_role||"Untitled Role"}
                        </p>
                        <p className="text-sm text-gray-600">{p.profession}</p>
                        {p.archetype &&
                          <span className="inline-block mt-1 text-xs bg-purple-100
                                            text-purple-700 px-2 py-0.5 rounded-full">
                            {p.archetype}
                          </span>}
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-gray-500">Last updated</p>
                        <p className="font-medium">
                          {new Date(p.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </li>)
                  )}
                </ul>
          )}
        </main>
      </div>
    </div>
  );
}

function AppContainer(){
  const [active,setActive] = useState<Profile|null>(null);
  return active
    ? <PrismApp profile={active} onExit={()=>setActive(null)}/>
    : <ProfileLoader onSelectProfile={setActive}/>;
}

/* =================================================================
   Mount React
   ================================================================= */
ReactDOM
  .createRoot(document.getElementById("root")!)
  .render(<React.StrictMode><AppContainer/></React.StrictMode>);
