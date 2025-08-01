/* ====================================================================
   index.tsx – PRISM Framework front‑end  (single self‑contained file)
   ==================================================================== */

const API_ROOT =
  (window as any).__PRISM_API__ ?? "http://127.0.0.1:8000";

/* ------------- React / library imports ---------------------------- */
import React, {
  useState, useEffect, useMemo
} from "react";
import ReactDOM from "react-dom/client";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis
} from "recharts";
import {
  Save, Eye, Trash2, X, ChevronsRight, ArrowLeft, PlusCircle,
  ServerCrash, RefreshCw, CheckCircle, Sparkles
} from "lucide-react";

/* ------------- Static data (from paper) ------------ */
const professionalRolesData = {
  "Insurance": {
    "Underwriting & Claims": ["Underwriter", "Actuary", "Claims Adjuster / Examiner", "Medical Underwriter", "Chief Medical Officer"],
    "Sales & Distribution": ["Insurance Agent", "Broker", "Bancassurance Manager", "Digital Sales Specialist", "Customer Service Representative", "Renewals & Retention Specialist"],
    "Loss Assessment & Investigation": ["Loss Assessor / Surveyor", "Fraud Investigator (SIU)", "Subrogation & Recovery Analyst", "Valuation Appraiser"],
    "Legal, Compliance & Operations": ["In-house Counsel", "Compliance Officer", "New-business Processing Executive", "Policy Issuance & Endorsement Specialist", "Data Entry Associate"],
    "Reinsurance": ["Reinsurance Underwriter", "Reinsurance Broker", "Treaty Negotiator"],
    "Enterprise Risk & Analytics": ["Chief Risk Officer", "Enterprise Risk Analyst", "Catastrophe Modeller"],
    "Finance & Investments": ["Finance Manager", "Investment Analyst", "Asset-Liability Manager"],
    "Technology & Data": ["Insurance Systems Analyst", "InsurTech Product Owner", "Data Scientist", "Actuarial Data Engineer"],
    "Support Functions": ["Human Resources Manager", "Marketing & Brand Communications", "Internal Auditor", "Facilities & Administration"]
  },
  "Software Engineering": {
    "Frontend Development": ["UI Engineer", "Frontend Developer", "Web Developer", "UX Engineer"],
    "Backend Development": ["Backend Engineer", "API Developer", "Database Engineer", "Systems Programmer"],
    "Full-Stack Development": ["Full-Stack Engineer", "Software Engineer"],
    "DevOps & SRE": ["DevOps Engineer", "Site Reliability Engineer", "Cloud Engineer", "Build & Release Engineer"],
    "Mobile Development": ["iOS Developer", "Android Developer", "Mobile Engineer"],
    "QA & Testing": ["QA Engineer", "Software Development Engineer in Test (SDET)", "Automation Engineer"],
    "Data & ML": ["Machine Learning Engineer", "Data Engineer", "AI/ML Scientist"]
  }
};

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
  { aspect:"Skills (Cognitive)", approaches:[ "Puzzle mechanics requiring logical deduction", "Data-interpretation interfaces and mini-games", "Systems demanding pattern recognition", "Complex decision-tree navigation", "Investigative tasks with clues and red herrings", "Simulations requiring strategic planning" ]},
  { aspect:"Skills (Interpersonal)", approaches:[ "Dialogue systems with nuanced emotional responses", "Negotiation mechanics with AI or human players", "Team-based objectives requiring shared understanding", "Role-playing scenarios for conflict resolution" ]},
  { aspect:"Skills (Psychomotor)", approaches:[ "Physics-based interaction mechanics for tool use", "Direct manipulation controls requiring dexterity", "Simulations of physical procedures", "Tasks emphasizing precise timing and coordination" ]},
  { aspect:"Knowledge", approaches:[ "In-game encyclopedias / manuals / knowledge bases", "Interactive tutorials demonstrating concepts", "Scenarios requiring direct application of theories", "Feedback systems that correct misconceptions" ]},
  { aspect:"Identity", approaches:[ "Avatar customisation reflecting professional roles", "Narrative choices that shape professional identity", "NPCs who recognise & respond to the player's role", "Opportunities to take on leadership or specialist roles" ]},
  { aspect:"Values & Ethics", approaches:[ "Moral / ethical dilemma scenarios in the narrative", "Branching storylines with value-laden consequences", "Systems tracking reputation / trust / ethical standing", "Reflective prompts on ethical considerations" ]}
];

const archetypes = [
  { name:"Analytical Strategist", description:"Data-driven decision maker with strong analytical and strategic thinking capabilities", dominant:["Skills-Cognitive","Knowledge-Conceptual"], supporting:["Identity-Problem Solver","Values-Objectivity"], examples:["Management Consultant","Financial Analyst","Research Director"] },
  { name:"Empathetic People Leader", description:"Human-centered leader focused on team development and collaborative success", dominant:["Skills-Interpersonal","Identity-Mentor","Values-Team Wellbeing"], supporting:["Knowledge-Organisational","Ethics-Relational"], examples:["Team Manager","HR Leader","Executive Coach"] },
  { name:"Technical Virtuoso", description:"Domain expert with deep technical skills and precision-focused approach", dominant:["Skills-Psychomotor","Knowledge-Procedural"], supporting:["Identity-Specialist","Values-Mastery"], examples:["Master Surgeon","Elite Programmer","Research Scientist"] },
  { name:"Ethical Guardian", description:"Principles-driven professional focused on integrity and moral reasoning", dominant:["Ethics-All","Values-Integrity","Knowledge-Regulatory"], supporting:["Skills-Critical Evaluation","Skills-Communication"], examples:["Judge","Compliance Officer","Ethics Consultant"] }
];

/* ------------- Type declarations ------------------------------ */
interface RoleData { 
    profession:string; 
    department: string; 
    specificRole:string; 
    description:string; 
    key_responsibilities?: string; // JSON string of SelectedKRA[]
    day_to_day_tasks?: string;     // JSON string of string[]
}
interface SelectedKRA {
    id: number | null; // null for custom KRAs
    label: string;
}
interface MasterKRA {
    id: number;
    label: string;
    bucket: string;   // e.g. Insurance, Software Engineering …
}

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
  id:number; 
  specific_role:string; 
  profession:string; 
  department: string;
  updated_at:string; 
  archetype:string|null;
}

/* ------------- Helpers ---------------------------------------- */
// resilient JSON.parse for local string fields
const safeJsonParse = <T,>(s: string | undefined | null, fallback:T):T => {
  if(!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
};

const getInitialProfile = ():Profile => ({
  id:null,
  roleData:{ 
      profession:"", 
      department: "", 
      specificRole:"", 
      description:"", 
      key_responsibilities: "[]", 
      day_to_day_tasks: "[]" 
  },
  skiveRatings:{
    skills:{
      cognitive   :{ analytical: 1, decisionMaking: 1, strategicPlanning: 1, criticalEvaluation: 1 },
      interpersonal:{ communication: 1, collaboration: 1, empathy: 1, negotiation: 1 },
      psychomotor :{ precision: 1, proceduralExecution: 1, coordination: 1 },
      metacognitive:{ reflection: 1, adaptability: 1, selfRegulation: 1 }
    },
    knowledge:{
      declarative :{ conceptual: 1, factual: 1, theoretical: 1 },
      procedural  :{ methods: 1, processes: 1, techniques: 1 },
      conditional :{ whenToApply: 1, contextualUse: 1 }
    },
    identity:{ professionalRole: 1, communityBelonging: 1, selfEfficacy: 1, dispositions: 1 },
    values  :{ coreValues: 1, epistemicValues: 1, stakeholderValues: 1 },
    ethics  :{ deontological: 1, consequentialist: 1, virtue: 1 }
  },
  aleDesign:{ learningObjectives:{}, selectedAleComponents:{}, selectedSkiveApproaches:{} },
  archetype:null
});

/* =================================================================
   Sub‑components – Task list & KRA selector
   ================================================================= */

function TaskListEditor({ tasks, onChange }: { tasks: string[]; onChange: (tasks: string[]) => void; }) {
  const add = () => onChange([...tasks, ""]);
  const del = (idx:number) => onChange(tasks.filter((_,i)=>i!==idx));
  const edit = (idx:number,val:string) => onChange(tasks.map((t,i)=>i===idx?val:t));
  return (
    <div className="space-y-3 mt-4">
      <h4 className="font-medium text-gray-700">Typical Day-to-Day Tasks</h4>
      {tasks.map((t,i)=>(
        <div key={i} className="flex items-center gap-2">
          <input value={t} onChange={e=>edit(i,e.target.value)} placeholder="e.g. Validate policy documents" className="flex-1 p-2 border rounded" />
          <button className="p-2 text-gray-500 hover:text-red-600" onClick={()=>del(i)} aria-label="Remove"><Trash2 size={16}/></button>
        </div>))}
      <button onClick={add} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"><PlusCircle size={16}/> Add Task</button>
    </div>
  );
}

function KRASelector({ selected, onChange, profession }:{ selected:SelectedKRA[]; onChange:(k:SelectedKRA[])=>void; profession:string; }){
  const [master,setMaster] = useState<MasterKRA[]>([]);
  const [draft,setDraft]   = useState("");

  useEffect(()=>{
    fetch(`${API_ROOT}/api/kras_master`)
      .then(r=>r.ok?r.json():[])
      .then((data:MasterKRA[])=>setMaster(data))
      .catch(()=>setMaster([]));
  },[]);

  const filtered = profession ? master.filter(m=>m.bucket===profession) : master;

  const toggle = (k:MasterKRA)=>{
    const exists = selected.some(s=>s.id===k.id);
    exists ? onChange(selected.filter(s=>s.id!==k.id)) : onChange([...selected,{id:k.id,label:k.label}]);
  };

  const addCustom = () => {
    if(!draft.trim()) return;
    if(selected.some(s=>s.label.toLowerCase()===draft.trim().toLowerCase())) return;
    onChange([...selected,{id:null,label:draft.trim()}]);
    setDraft("");
  };

  const remove = (idx:number)=>onChange(selected.filter((_,i)=>i!==idx));

  return (
    <div className="space-y-3 mt-4">
      <h4 className="font-medium text-gray-700">Key Responsibilities & KRAs</h4>
      <div className="flex flex-wrap gap-2 p-2 border rounded bg-gray-50 min-h-[40px]">
        {selected.length===0 && <span className="text-sm text-gray-400">Select or add KRAs…</span>}
        {selected.map((s,i)=>(<span key={i} className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">{s.label}<button onClick={()=>remove(i)} className="text-blue-600 hover:text-blue-900"><X size={14}/></button></span>))}
      </div>

      <select onChange={e=>{const id=parseInt(e.target.value); const k=filtered.find(m=>m.id===id); k && toggle(k); e.target.value="";}} disabled={filtered.length===0} className="w-full p-2 border rounded bg-white">
        <option value="">-- Select from library --</option>
        {filtered.map(k=>(<option key={k.id} value={k.id} disabled={selected.some(s=>s.id===k.id)}>{k.label}</option>))}
      </select>

      <div className="flex gap-2">
        <input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addCustom()} placeholder="Add custom KRA" className="flex-1 p-2 border rounded" />
        <button onClick={addCustom} className="px-3 py-2 bg-gray-200 rounded disabled:opacity-50" disabled={!draft.trim()}>Add</button>
      </div>
    </div>
  );
}

/* =================================================================
   Stage 1 component  ▸  ROLE PROFILER
   ================================================================= */
const competencyDescriptions: Record<string, string> = {
    analytical: "Ability to break down complex problems and identify patterns",
    decisionMaking: "Capacity to make informed choices under uncertainty",
    strategicPlanning: "Long-term thinking and planning capabilities",
    criticalEvaluation: "Assessing the validity and relevance of information",
    communication: "Effective verbal and written communication",
    collaboration: "Working effectively with others toward common goals",
    empathy: "Understanding and sharing the feelings of others",
    negotiation: "Reaching agreements through discussion and compromise",
    precision: "Executing tasks with exactness and accuracy",
    proceduralExecution: "Following established procedures consistently",
    coordination: "Synchronizing movements or actions effectively",
    reflection: "Thinking about one's own thinking and learning processes",
    adaptability: "Adjusting to new conditions and challenges",
    selfRegulation: "Managing one's own emotions, thoughts, and behaviors",
    conceptual: "Grasp of theories, principles, and models",
    factual: "Specific details, terminology, and information",
    theoretical: "Understanding of abstract principles and explanatory frameworks",
    methods: "Knowing how to perform specific tasks",
    processes: "Understanding sequences of actions to achieve a goal",
    techniques: "Skillful ways of carrying out a particular task",
    whenToApply: "Knowing when and why to use certain knowledge or skills",
    contextualUse: "Adapting knowledge application to specific situations",
    professionalRole: "Embracing characteristic professional roles and behaviors",
    communityBelonging: "Sense of belonging within the professional community",
    selfEfficacy: "Confidence in professional capabilities",
    dispositions: "Inherent qualities of mind and character (e.g., skepticism, curiosity)",
    coreValues: "Fundamental values like patient well-being, innovation, excellence",
    epistemicValues: "Values related to knowledge and evidence (e.g., empirical evidence, user-centricity)",
    stakeholderValues: "Considering the values and needs of all relevant stakeholders",
    deontological: "Adherence to professional codes and duty-based ethics",
    consequentialist: "Considering outcomes and consequences in decision-making",
    virtue: "Character traits like integrity, responsibility, and honesty"
};

function RoleProfiler(
  { profile, onProfileChange, onComplete, onSave, saveStatus }:{
    profile:Profile;
    onProfileChange:(u:(p:Profile)=>Profile)=>void;
    onComplete:()=>void;
    onSave:()=>Promise<void>;
    saveStatus:{ loading:boolean; message:string; isError:boolean };
  }
){
  const [step,setStep] = useState(0);

  type RatingNode = number | Record<string, any>;
  const avg = (o:RatingNode):number =>
    typeof o==="number" ? o :
    Object.values(o).reduce((s: number, v)=>s+avg(v),0) / Math.max(1,Object.values(o).length);

  const radarData = Object.entries(profile.skiveRatings).map(([k,v])=>({
    subject:k.charAt(0).toUpperCase()+k.slice(1),
    A:avg(v), fullMark:3
  }));

  const setRating = (path:string[], val:number)=>{
    onProfileChange(p=>{
      const clone = structuredClone(p.skiveRatings) as any;
      let cur = clone;
      for(let i=0;i<path.length-1;i++) cur = cur[path[i]];
      cur[path[path.length - 1]!] = val;
      return { ...p, skiveRatings:clone };
    });
  };

  const renderRatingScale = (value: number, onChange: (newValue: number) => void, label: string, description: string) => (
    <div className="mb-4 p-4 border rounded-lg bg-white">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-medium text-gray-900">{label}</h4>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <div className="flex items-center space-x-2 px-2 py-1 rounded-full bg-gray-100">
          <span className="text-sm font-semibold text-gray-800">
            {value === 1 ? 'Low' : value === 2 ? 'Medium' : 'High'}
          </span>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-500">Low</span>
        <div className="flex-1">
          <input type="range" min="1" max="3" value={value} onChange={(e) => onChange(parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider" />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1</span>
            <span>2</span>
            <span>3</span>
          </div>
        </div>
        <span className="text-sm text-gray-500">High</span>
      </div>
    </div>
  );

  const renderSelect = (label: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: string[], disabled: boolean = false) => (
      <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-2">{label}</span>
          <select 
              value={value} 
              onChange={onChange} 
              disabled={disabled}
              className="w-full p-3 mt-1 border border-gray-300 rounded-lg bg-white disabled:bg-gray-100"
          >
              <option value="">-- Select {label} --</option>
              {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
      </label>
  );

  const renderRatingSection = (sectionKey: keyof SkiveRatings) => {
    const sectionObj:any = profile.skiveRatings[sectionKey];
    const isNested = !Object.values(sectionObj).every(v => typeof v === 'number');
    
    return (
        <div key={sectionKey}>
          <h3 className="text-xl font-semibold capitalize text-gray-800 border-b pb-2 mb-4">{sectionKey}</h3>
          {isNested ? Object.entries(sectionObj).map(([subKey, subItems]) => (
            <div key={subKey} className="mt-4">
              <h4 className="font-medium text-gray-700 capitalize mb-2">{subKey}</h4>
              {Object.entries(subItems as Record<string, number>).map(([itemKey, itemValue]) => {
                  const label = itemKey.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
                  return renderRatingScale(itemValue, (val) => setRating([sectionKey, subKey, itemKey], val), label, competencyDescriptions[itemKey] || '');
              })}
            </div>
          )) : Object.entries(sectionObj).map(([itemKey, itemValue]) => {
                const label = itemKey.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
                return renderRatingScale(itemValue as number, (val) => setRating([sectionKey, itemKey], val), label, competencyDescriptions[itemKey] || '');
          })}
        </div>
    );
  };
  
  function page(){
    if(step===0) return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">Role Definition</h3>
          <div className="space-y-4 mt-4">
            {renderSelect("Profession", profile.roleData.profession, e => {
                onProfileChange(p => ({ ...p, roleData: { ...p.roleData, profession: e.target.value, department: "", specificRole: "", key_responsibilities: '[]' }}));
            }, Object.keys(professionalRolesData))}
    
            {renderSelect("Department", profile.roleData.department, e => {
                onProfileChange(p => ({ ...p, roleData: { ...p.roleData, department: e.target.value, specificRole: "" }}));
            }, profile.roleData.profession ? Object.keys(professionalRolesData[profile.roleData.profession as keyof typeof professionalRolesData] || {}) : [], !profile.roleData.profession)}
    
            {renderSelect("Specific Role", profile.roleData.specificRole, e => {
                onProfileChange(p => ({...p,roleData:{...p.roleData,specificRole:e.target.value}}));
            }, profile.roleData.department ? (professionalRolesData[profile.roleData.profession as keyof typeof professionalRolesData] as any)[profile.roleData.department] || [] : [], !profile.roleData.department)}
    
             <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">
                    Role Description
                </span>
                <textarea
                    rows={3}
                    placeholder="Describe the role at a high level…"
                    value={profile.roleData.description}
                    onChange={e => onProfileChange(p => ({ ...p, roleData: { ...p.roleData, description: e.target.value } })) }
                    className="w-full p-3 mt-1 border border-gray-300 rounded-lg"
                />
            </label>

            <TaskListEditor
                tasks={ safeJsonParse(profile.roleData.day_to_day_tasks, []) }
                onChange={list => onProfileChange(p => ({ ...p, roleData: { ...p.roleData, day_to_day_tasks: JSON.stringify(list) } })) }
            />

            <KRASelector
                profession={profile.roleData.profession}
                selected={ safeJsonParse(profile.roleData.key_responsibilities, []) }
                onChange={list => onProfileChange(p => ({ ...p, roleData: { ...p.roleData, key_responsibilities: JSON.stringify(list) } })) }
            />
          </div>
        </div>
        
        <div className="border-t pt-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                {/* Column 1 */}
                <div className="space-y-8">
                    {renderRatingSection('skills')}
                    {renderRatingSection('knowledge')}
                </div>
                {/* Column 2 */}
                <div className="space-y-8">
                    {renderRatingSection('identity')}
                    {renderRatingSection('values')}
                    {renderRatingSection('ethics')}
                </div>
            </div>
        </div>
      </div>
    );

    // Summary Page
    return (
      <div className="space-y-6">
        <div className="flex items-center mb-4"><Eye className="text-indigo-600 mr-2"/> <h3 className="text-lg font-semibold">Summary</h3></div>
        <div className="p-6 bg-gray-100 rounded-lg"><h4 className="font-semibold">{profile.roleData.specificRole||"Untitled Role"}</h4><p className="text-gray-600">{profile.roleData.profession ? `${profile.roleData.profession} / ${profile.roleData.department}` : ''}</p><p className="text-sm mt-2">{profile.roleData.description}</p></div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 border rounded-lg">
            <h4 className="font-semibold text-center mb-4">SKIVE Radar</h4>
            <div className="w-full h-[300px] flex items-center justify-center">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" width={400} height={300} data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={90} domain={[0, 3]} tick={false} axisLine={false} />
                    <Radar name="Proficiency" dataKey="A" stroke="#2563eb" fill="#2563eb" fillOpacity={.4} />
                </RadarChart>
            </div>
          </div>
          <div className="space-y-4"><h4 className="font-semibold mb-2">Archetype Match</h4>{archetypes.map(a=>(<div key={a.name} onClick={()=>onProfileChange(p=>({...p,archetype:p.archetype===a.name?null:a.name}))} className={`p-3 mb-2 border rounded-lg cursor-pointer transition-all ${profile.archetype===a.name?"border-blue-500 bg-blue-50 ring-1 ring-blue-500":"hover:border-gray-300 bg-white"}`}><h5 className="font-medium text-gray-800">{a.name}</h5><p className="text-sm text-gray-600">{a.description}</p>{profile.archetype===a.name&&<p className="mt-2 pt-2 border-t text-xs text-gray-700"><b>Examples:</b> {a.examples.join(", ")}</p>}</div>))}</div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4 border-t"><button onClick={onSave} disabled={saveStatus.loading} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"><Save size={16}/> {saveStatus.loading?"Saving…":"Save Profile"}</button>{saveStatus.message &&<span className={`mt-2 sm:mt-0 text-sm font-medium ${saveStatus.isError?"text-red-600":"text-green-600"}`}>{saveStatus.message}</span>}</div>
      </div>
    );
  }

  const steps = ["Define & Rate", "Summarize & Finalize"];

  return (
    <><div className="px-6 py-5 border-b border-gray-200"><div className="flex justify-between items-center mb-2"><h2 className="text-lg font-semibold text-gray-800">Stage 1: SKIVE Role Profiling</h2><span className="text-sm font-medium text-blue-600">Page {step+1} of {steps.length}</span></div><div className="w-full bg-gray-200 rounded-full h-2.5"><div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out" style={{ width:`${(step / (steps.length-1)) * 100}%` }}/></div></div><div className="p-6 bg-gray-50">{page()}</div><div className="px-6 py-4 border-t border-gray-200 flex justify-between bg-white"><button onClick={()=>setStep(0)} disabled={step===0} className="px-6 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-100">Previous</button>{step===steps.length-1? <button onClick={onComplete} className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg flex items-center gap-2 hover:bg-green-700">Proceed to Stage 2 <ChevronsRight size={18}/></button> : <button onClick={()=>setStep(1)} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">Next</button>}</div></>
  );
}

/* =================================================================
   Stage 2 component ▸  ALE DESIGNER
   ================================================================= */
function ALEDesigner(
  { profile, onProfileChange, onBack, onSave, onFinish, saveStatus }:{
    profile:Profile;
    onProfileChange:(u:(p:Profile)=>Profile)=>void;
    onBack:()=>void;
    onSave:()=>Promise<void>;
    onFinish:()=>void;
    saveStatus:{ loading:boolean; message:string; isError:boolean };
  }
){
  const [ai,setAI] = useState<Record<string,{loading:boolean; err:string|null}>>({});
  const competencies = useMemo(()=>{
    const list:{ id:string; name:string; category:string; subCategory: string; value:number }[] = [];
    const walk=(obj:any,path:string[])=>{
      Object.entries(obj).forEach(([k,v])=>{
        if(typeof v==="number"){ 
          if(v>1) list.push({ 
            id:[...path,k].join("-"), 
            name:k.replace(/([A-Z])/g," $1").replace(/^./,s=>s.toUpperCase()), 
            category: path[0],
            subCategory: path.length > 1 ? path[1] : path[0],
            value:v 
          });
        } else {
          walk(v as any,[...path,k]);
        }
      });
    };
    Object.entries(profile.skiveRatings).forEach(([cat,v])=>walk(v as any,[cat]));
    return list.sort((a,b)=>b.value-a.value);
  },[profile.skiveRatings]);

  const suggest = async (c:{id:string;name:string;category:string})=>{
    setAI(p=>({...p,[c.id]:{loading:true,err:null}}));
    try{
        const tasks = safeJsonParse(profile.roleData.day_to_day_tasks, []);
        const kras: SelectedKRA[] = safeJsonParse(profile.roleData.key_responsibilities, []);

        const contextPrompt = `For a professional role of "${profile.roleData.specificRole}", generate one concise SMART learning objective suitable for a serious game simulation. This objective is for the sub-competency "${c.name}" within the SKIVE dimension "${c.category}". Use the following context to make the objective highly relevant and practical:
- Role Description: ${profile.roleData.description || 'Not provided.'}
- Key Responsibilities/KRAs: ${kras.length > 0 ? kras.map(k => `- ${k.label}`).join('\n') : 'Not provided.'}
- Typical Day-to-Day Tasks: ${tasks.length > 0 ? tasks.map(t => `- ${t}`).join('\n') : 'Not provided.'}`;

      const res = await fetch(`${API_ROOT}/api/generate-objective`,{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ prompt: contextPrompt }) });
      if(!res.ok) throw new Error(`AI server request failed with status ${res.status}`);
      const {text} = await res.json();
      onProfileChange(p=>({ ...p, aleDesign:{ ...p.aleDesign, learningObjectives:{ ...p.aleDesign.learningObjectives, [c.id]:text } } }));
    }catch(e){
      setAI(p=>({...p,[c.id]:{loading:false,err:(e as Error).message}}));
    }finally{
      setAI(p=>({...p,[c.id]:{...p[c.id],loading:false}}));
    }
  };
  const toggle = ( group:"selectedAleComponents"|"selectedSkiveApproaches", key:string, value:string, checked:boolean )=>{
    onProfileChange(p=>{ const set = new Set(p.aleDesign[group][key] ?? []); checked? set.add(value) : set.delete(value); return { ...p, aleDesign:{ ...p.aleDesign, [group]:{ ...p.aleDesign[group], [key]:Array.from(set) } } }; });
  };
  return (
    <><div className="px-6 py-5 border-b border-gray-200"><h2 className="text-lg font-semibold text-gray-800">Stage 2: ALE Designer</h2><p className="text-sm text-gray-600">Map the profile into a learning-game design.</p></div>
    <div className="p-6 space-y-8 bg-gray-50">
        <section><h3 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">1. Prioritised Competencies & Objectives</h3><p className="text-sm text-gray-600 mb-4">Based on your profile, here are the competencies rated Medium or High. Use the AI assistant to generate SMART learning objectives for your game.</p>{competencies.length===0 &&<p className="text-center text-gray-500 py-4">No competency rated Medium/High.</p>}{competencies.map(c=>(<div key={c.id} className="p-4 bg-white border rounded-lg mb-3"><div className="flex justify-between items-start"><div><div className="text-xs uppercase font-semibold text-gray-500">{c.subCategory === c.category ? c.category : `${c.category} / ${c.subCategory}`}</div><h4 className="font-semibold text-lg text-gray-900 capitalize">{c.name}</h4></div><span className={`px-2 py-0.5 rounded-full text-sm font-semibold ${c.value===3?"bg-blue-100 text-blue-800":"bg-yellow-100 text-yellow-800"}`}>{c.value===3?"High":"Medium"}</span></div><textarea rows={2} value={profile.aleDesign.learningObjectives[c.id]||""} onChange={e=>onProfileChange(p=>({...p, aleDesign:{...p.aleDesign, learningObjectives:{...p.aleDesign.learningObjectives, [c.id]:e.target.value}}}))} placeholder="Define a SMART learning objective…" className="w-full p-2 mt-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/><div className="flex items-center justify-end mt-2">{ai[c.id]?.err && <span className="text-xs text-red-500 mr-4">{ai[c.id]!.err}</span>}<button onClick={()=>suggest(c)} disabled={ai[c.id]?.loading} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 disabled:opacity-60"><Sparkles size={14}/>{ai[c.id]?.loading?"Generating…":"Suggest Objective"}</button></div></div>))}
        </section>
        <section><h3 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">2. Authentic-Learning Features</h3>{aleFeaturesData.map(f=>(<details key={f.feature} className="border rounded-lg mb-3 bg-white p-4 group" open><summary className="font-semibold text-lg cursor-pointer list-none flex justify-between items-center">{f.feature}<span className="text-gray-400 group-open:rotate-90 transition-transform">▶</span></summary><div className="grid md:grid-cols-2 gap-3 mt-4">{f.components.map(c=>(<label key={c} className="flex items-center gap-3 p-2 space-x-3 bg-gray-50 rounded-md hover:bg-gray-100"><input type="checkbox" checked={profile.aleDesign.selectedAleComponents?.[f.feature]?.includes(c)||false} onChange={e=>toggle("selectedAleComponents",f.feature,c,e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/><span className="text-sm text-gray-700">{c}</span></label>))}</div></details>))}
        </section>
        <section><h3 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">3. SKIVE-Aligned Game Approaches</h3>{skiveGameApproachesData.map(a=>(<details key={a.aspect} className="border rounded-lg mb-3 bg-white p-4 group" open><summary className="font-semibold text-lg cursor-pointer list-none flex justify-between items-center">{a.aspect}<span className="text-gray-400 group-open:rotate-90 transition-transform">▶</span></summary><div className="grid md:grid-cols-2 gap-3 mt-4">{a.approaches.map(ap=>(<label key={ap} className="flex items-center gap-3 p-2 space-x-3 bg-gray-50 rounded-md hover:bg-gray-100"><input type="checkbox" checked={profile.aleDesign.selectedSkiveApproaches?.[a.aspect]?.includes(ap)||false} onChange={e=>toggle("selectedSkiveApproaches",a.aspect,ap,e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/><span className="text-sm text-gray-700">{ap}</span></label>))}</div></details>))}
        </section>
    </div>
    <div className="px-6 py-4 border-t border-gray-200 flex justify-between bg-white items-center">
        <button onClick={onBack} className="flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"><ArrowLeft size={18}/> Back to Profiler</button>
        <div className="flex items-center gap-4">
            {saveStatus.message && <span className={`text-sm font-medium ${saveStatus.isError ? "text-red-600" : "text-green-600"}`}>{saveStatus.message}</span>}
            <button onClick={onSave} disabled={saveStatus.loading} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"><Save size={16}/> {saveStatus.loading ? "Saving…" : "Save Design"}</button>
            <button onClick={onFinish} className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700"><CheckCircle size={18}/> Save & Finish</button>
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
  
  const saveProfile = async ()=>{
    setSaveInfo({ loading:true, message:"", isError:false });
    try {
      const res = await fetch(`${API_ROOT}/api/profiles`,{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ...profile, id:profile.id??null }) });
      if(!res.ok) throw new Error("Save request failed with status "+res.status);
      const data = await res.json();
      updateProfile(p=>({ ...p, id:data.id }));
      setSaveInfo({ loading:false, message:data.message||"Saved successfully!", isError:false });
    }catch(e){
      setSaveInfo({ loading:false, message:(e as Error).message, isError:true });
    }
  };

  const handleFinish = async () => {
    await saveProfile();
    onExit();
  };

  const stageComponents = {
    profiling: <RoleProfiler
                  profile={profile}
                  onProfileChange={updateProfile}
                  onComplete={()=>setStage("designing")}
                  onSave ={saveProfile}
                  saveStatus={saveInfo}/>,
    designing: <ALEDesigner
                  profile={profile}
                  onProfileChange={updateProfile}
                  onBack ={()=>setStage("profiling")}
                  onFinish={handleFinish}
                  onSave ={saveProfile}
                  saveStatus={saveInfo}/>,
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <button onClick={onExit} className="mb-4 flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"><ArrowLeft size={16}/> Back to Dashboard</button>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <header className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">PRISM Framework</h1>
              <p className="text-gray-600">Professional Role Identity & SKIVE-Mapped Environments</p>
            </div>
            <div className="flex gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${stage==='profiling' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Stage 1</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${stage==='designing' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Stage 2</span>
            </div>
          </div>
        </header>
        {stageComponents[stage as keyof typeof stageComponents]}
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
      if(!res.ok) throw new Error(`Server connection failed: ${res.status}`);
      const data = await res.json();
      setList(data);
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
      if(!res.ok) throw new Error(`Failed to load profile: ${res.status}`);
      const loadedData = await res.json();
      const completeProfile = {
        ...getInitialProfile(),
        ...loadedData,
        id: loadedData.id,
      };
      onSelectProfile(completeProfile);
    }catch(e){
      setState({ loading:false, err:(e as Error).message });
    }
  };
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="bg-white rounded-lg shadow-lg">
        <header className="p-6 border-b"><h1 className="text-2xl font-bold text-gray-900">PRISM Profile Dashboard</h1><p className="text-gray-600">Select a profile to edit or create a new one.</p></header>
        <main className="p-6">
          <button onClick={()=>onSelectProfile(getInitialProfile())} className="w-full flex items-center justify-center gap-2 mb-6 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"><PlusCircle size={20}/> Create New Profile</button>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Existing Profiles</h2>
          {state.loading && <p className="text-center py-4">Loading profiles…</p>}
          {state.err && (<div className="py-8 px-4 text-center bg-red-50 border border-red-200 rounded-lg"><ServerCrash className="mx-auto text-red-500 mb-2" size={32}/><p className="font-semibold text-red-700">Connection Error</p><p className="text-sm text-red-600 mb-4">{state.err}</p><button onClick={loadAll} className="flex items-center mx-auto gap-2 px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"><RefreshCw size={14}/> Retry</button></div>)}
          {(!state.loading && !state.err) && (
            list.length===0
              ? <p className="text-center text-gray-500 py-4">No saved profiles found.</p>
              : <ul className="space-y-3">{list.map(p=>(<li key={p.id} onClick={()=>loadOne(p.id)} className="grid grid-cols-3 items-center p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors">
                  <div className="col-span-2">
                    <p className="font-semibold text-blue-800">{p.specific_role||"Untitled Role"}</p>
                    <p className="text-sm text-gray-600">{p.profession}{p.department ? ` / ${p.department}` : ''}</p>
                    {p.archetype &&<span className="inline-block mt-1 text-xs font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{p.archetype}</span>}
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-gray-500">Last updated</p>
                    <p className="font-medium text-gray-700">{new Date(p.updated_at).toLocaleDateString()}</p>
                  </div>
                </li>))}</ul>
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

