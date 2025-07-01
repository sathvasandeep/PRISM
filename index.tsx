import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { Save, Download, Eye, Users, Brain, Heart, Shield, Lightbulb, Sparkles, ChevronsRight, ArrowLeft } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// --- AI Initialization ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Data from PRISM Paper ---
const aleFeaturesData = [
    { feature: 'Authentic Tasks', components: ['Scenario-based challenges with ill-defined problems', 'Dynamic data feeds reflecting real-time changes', 'Resource management systems with constraints', 'Unexpected event triggers or "wild cards"', 'Systems modeling conflicting goals or stakeholder needs', 'Information displays with asymmetry or "fog-of-war"'] },
    { feature: 'Multiple Perspectives', components: ['Multiplayer modes (cooperative or competitive)', 'AI agents with distinct goals, biases, or personalities', 'Branching narrative structures', 'Access to diverse in-game information sources (news, reports)'] },
    { feature: 'Collaboration & Social Dialogue', components: ['Integrated text or voice chat systems', 'Sophisticated NPC dialogue systems with meaningful choices', 'Shared task interfaces or objectives', 'In-game forums or knowledge-sharing channels'] },
    { feature: 'Reflection & Articulation', components: ['In-game journaling tools or "captain\'s logs"', 'Guided reflection prompts after key events', 'Action replay or review systems', 'Game mechanics requiring players to justify choices'] },
    { feature: 'Scaffolding & Coaching', components: ['Introductory tutorial levels or guided practice', 'Adaptive hint systems based on player performance', 'In-game AI mentors or characters offering advice', 'Progressively increasing difficulty and complexity'] },
    { feature: 'Authentic Context', components: ['Rich narrative backstories and world-building', 'Realistic environmental design (visual, auditory, haptic)', 'Game rules and constraints mirroring real-world limitations', 'Culturally relevant scenarios, characters, and dilemmas'] }
];

const skiveGameApproachesData = [
    { aspect: 'Skills (Cognitive)', approaches: ['Puzzle mechanics requiring logical deduction', 'Data interpretation interfaces and mini-games', 'Systems demanding pattern recognition', 'Complex decision-tree navigation', 'Investigative tasks with clues and red herrings', 'Simulations requiring strategic planning'] },
    { aspect: 'Skills (Interpersonal)', approaches: ['Dialogue systems with nuanced emotional responses', 'Negotiation mechanics with AI or human players', 'Team-based objectives requiring shared understanding', 'Role-playing scenarios for conflict resolution'] },
    { aspect: 'Skills (Psychomotor)', approaches: ['Physics-based interaction mechanics for tool use', 'Direct manipulation controls requiring dexterity', 'Simulations of physical procedures', 'Tasks emphasizing precise timing and coordination'] },
    { aspect: 'Knowledge', approaches: ['In-game encyclopedias, manuals, or knowledge bases', 'Interactive tutorials demonstrating concepts/procedures', 'Scenarios requiring direct application of specific theories', 'Feedback systems that correct misconceptions'] },
    { aspect: 'Identity', approaches: ['Avatar customization reflecting professional roles', 'Narrative choices that shape professional identity', 'NPCs who recognize and respond to the player\'s role', 'Opportunities to take on leadership or specialized roles'] },
    { aspect: 'Values & Ethics', approaches: ['Moral or ethical dilemma scenarios in the narrative', 'Branching storylines with clear value-laden consequences', 'Systems tracking player reputation, trust, or ethical standing', 'Reflective prompts on the ethical considerations of actions'] }
];

const archetypes = [
    { name: "Analytical Strategist", description: "Data-driven decision maker with strong analytical and strategic thinking capabilities", dominant: ["Skills-Cognitive", "Knowledge-Conceptual"], supporting: ["Identity-Problem Solver", "Values-Objectivity"], examples: ["Management Consultant", "Financial Analyst", "Research Director"] },
    { name: "Empathetic People Leader", description: "Human-centered leader focused on team development and collaborative success", dominant: ["Skills-Interpersonal", "Identity-Mentor", "Values-Team Wellbeing"], supporting: ["Knowledge-Organizational", "Ethics-Relational"], examples: ["Team Manager", "HR Leader", "Executive Coach"] },
    { name: "Technical Virtuoso", description: "Domain expert with deep technical skills and precision-focused approach", dominant: ["Skills-Psychomotor", "Knowledge-Procedural"], supporting: ["Identity-Specialist", "Values-Mastery"], examples: ["Master Surgeon", "Elite Programmer", "Research Scientist"] },
    { name: "Ethical Guardian", description: "Principles-driven professional focused on integrity and moral reasoning", dominant: ["Ethics-All", "Values-Integrity", "Knowledge-Regulatory"], supporting: ["Skills-Critical Evaluation", "Skills-Communication"], examples: ["Judge", "Compliance Officer", "Ethics Consultant"] }
];

// --- Main Application Component ---
const PrismApp = () => {
    const [appStage, setAppStage] = useState('profiling'); // 'profiling' or 'designing'
    
    const [roleData, setRoleData] = useState({
        profession: '',
        specificRole: '',
        description: ''
    });

    const [skiveRatings, setSkiveRatings] = useState({
        skills: { cognitive: { analytical: 1, decisionMaking: 1, strategicPlanning: 1 }, interpersonal: { communication: 1, collaboration: 1 } },
        knowledge: { declarative: { conceptual: 1, factual: 1 }, procedural: { methods: 1 } },
        identity: { professionalRole: 1, communityBelonging: 1, selfEfficacy: 1 },
        values: { coreValues: 1, epistemicValues: 1 },
        ethics: { deontological: 1, consequentialist: 1, virtue: 1 }
    });

    const [aleDesign, setAleDesign] = useState({
        learningObjectives: {},
        selectedAleComponents: {},
        selectedSkiveApproaches: {},
    });

    const handleGoToDesigner = () => setAppStage('designing');
    const handleGoToProfiler = () => setAppStage('profiling');

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h1 className="text-2xl font-bold text-gray-900">PRISM Framework</h1>
                    <p className="text-gray-600">Professional Role Identity & SKIVE Mapped Environments</p>
                </div>
                
                {appStage === 'profiling' && (
                    <RoleProfiler
                        roleData={roleData}
                        setRoleData={setRoleData}
                        skiveRatings={skiveRatings}
                        setSkiveRatings={setSkiveRatings}
                        onComplete={handleGoToDesigner}
                    />
                )}

                {appStage === 'designing' && (
                    <ALEDesigner
                        roleData={roleData}
                        skiveRatings={skiveRatings}
                        aleDesign={aleDesign}
                        setAleDesign={setAleDesign}
                        onBack={handleGoToProfiler}
                    />
                )}
            </div>
        </div>
    );
};

// --- Stage 1: Role Profiler Component ---
const RoleProfiler = ({ roleData, setRoleData, skiveRatings, setSkiveRatings, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedArchetype, setSelectedArchetype] = useState(null);
  const [saveStatus, setSaveStatus] = useState({ loading: false, message: '', isError: false });

  const steps = ["Role Definition", "Skills", "Knowledge", "Identity", "Values", "Ethics", "Summary"];

  const getAggregatedScores = () => {
    const calculateSubCategoryAvg = (category: object) => {
      const values = Object.values(category) as number[];
      return values.reduce((s, v) => s + v, 0) / (values.length || 1);
    }
    
    const skillsAvg = Object.values(skiveRatings.skills).reduce((acc, category) => acc + calculateSubCategoryAvg(category), 0) / (Object.keys(skiveRatings.skills).length || 1);
    const knowledgeAvg = Object.values(skiveRatings.knowledge).reduce((acc, category) => acc + calculateSubCategoryAvg(category), 0) / (Object.keys(skiveRatings.knowledge).length || 1);
    const identityAvg = calculateSubCategoryAvg(skiveRatings.identity);
    const valuesAvg = calculateSubCategoryAvg(skiveRatings.values);
    const ethicsAvg = calculateSubCategoryAvg(skiveRatings.ethics);

    return [
      { subject: 'Skills', A: skillsAvg, fullMark: 3 }, { subject: 'Knowledge', A: knowledgeAvg, fullMark: 3 },
      { subject: 'Identity', A: identityAvg, fullMark: 3 }, { subject: 'Values', A: valuesAvg, fullMark: 3 },
      { subject: 'Ethics', A: ethicsAvg, fullMark: 3 }
    ];
  };

  const handleSaveProfile = async () => { /* ... existing save logic ... */ };

  const renderRatingScale = (value, onChange, label, description) => (
    <div className="mb-4 p-4 border rounded-lg bg-white">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-medium text-gray-900">{label}</h4>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">{value === 1 ? 'Low' : value === 2 ? 'Medium' : 'High'}</span>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-500">Low</span>
        <div className="flex-1">
          <input type="range" min="1" max="3" value={value} onChange={(e) => onChange(parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider" />
          <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1</span><span>2</span><span>3</span></div>
        </div>
        <span className="text-sm text-gray-500">High</span>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch(currentStep) {
      case 0: return (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Role Definition</h3>
          <div><label className="block text-sm font-medium text-gray-700 mb-2">Target Profession</label><input type="text" value={roleData.profession} onChange={(e) => setRoleData({...roleData, profession: e.target.value})} placeholder="e.g., Healthcare, Engineering" className="w-full p-3 border border-gray-300 rounded-lg"/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-2">Specific Role</label><input type="text" value={roleData.specificRole} onChange={(e) => setRoleData({...roleData, specificRole: e.target.value})} placeholder="e.g., Emergency Room Physician" className="w-full p-3 border border-gray-300 rounded-lg"/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-2">Role Description</label><textarea value={roleData.description} onChange={(e) => setRoleData({...roleData, description: e.target.value})} placeholder="Describe the key responsibilities..." rows={4} className="w-full p-3 border border-gray-300 rounded-lg"/></div>
        </div>);
      case 1: return (
        <div className="space-y-6"><div className="flex items-center mb-4"><Brain className="mr-2 text-blue-600" size={24} /><h3 className="text-lg font-semibold">Skills Assessment</h3></div><div className="space-y-4"><h4 className="font-medium text-gray-800 border-b pb-2">Cognitive Skills</h4>{renderRatingScale(skiveRatings.skills.cognitive.analytical,(val) => setSkiveRatings({...skiveRatings, skills: {...skiveRatings.skills, cognitive: {...skiveRatings.skills.cognitive, analytical: val}}}),"Analytical Reasoning","Ability to break down complex problems")}{renderRatingScale(skiveRatings.skills.cognitive.decisionMaking,(val) => setSkiveRatings({...skiveRatings, skills: {...skiveRatings.skills, cognitive: {...skiveRatings.skills.cognitive, decisionMaking: val}}}),"Decision Making","Capacity to make informed choices")}{renderRatingScale(skiveRatings.skills.cognitive.strategicPlanning,(val) => setSkiveRatings({...skiveRatings, skills: {...skiveRatings.skills, cognitive: {...skiveRatings.skills.cognitive, strategicPlanning: val}}}),"Strategic Planning","Long-term thinking and planning")}<h4 className="font-medium text-gray-800 border-b pb-2 pt-6">Interpersonal Skills</h4>{renderRatingScale(skiveRatings.skills.interpersonal.communication,(val) => setSkiveRatings({...skiveRatings, skills: {...skiveRatings.skills, interpersonal: {...skiveRatings.skills.interpersonal, communication: val}}}),"Communication","Effective verbal and written communication")}{renderRatingScale(skiveRatings.skills.interpersonal.collaboration,(val) => setSkiveRatings({...skiveRatings, skills: {...skiveRatings.skills, interpersonal: {...skiveRatings.skills.interpersonal, collaboration: val}}}),"Collaboration","Working effectively with others")}</div></div>);
      case 2: return (
        <div className="space-y-6"><div className="flex items-center mb-4"><Lightbulb className="mr-2 text-yellow-600" size={24} /><h3 className="text-lg font-semibold">Knowledge Evaluation</h3></div><div className="space-y-4"><h4 className="font-medium text-gray-800 border-b pb-2">Declarative Knowledge</h4>{renderRatingScale(skiveRatings.knowledge.declarative.conceptual,(val) => setSkiveRatings({...skiveRatings, knowledge: {...skiveRatings.knowledge, declarative: {...skiveRatings.knowledge.declarative, conceptual: val}}}),"Conceptual Understanding","Grasp of theories, principles, and models")}{renderRatingScale(skiveRatings.knowledge.declarative.factual,(val) => setSkiveRatings({...skiveRatings, knowledge: {...skiveRatings.knowledge, declarative: {...skiveRatings.knowledge.declarative, factual: val}}}),"Factual Knowledge","Specific details, terminology, and information")}<h4 className="font-medium text-gray-800 border-b pb-2 pt-6">Procedural Knowledge</h4>{renderRatingScale(skiveRatings.knowledge.procedural.methods,(val) => setSkiveRatings({...skiveRatings, knowledge: {...skiveRatings.knowledge, procedural: {...skiveRatings.knowledge.procedural, methods: val}}}),"Methods & Processes","Knowing how to perform specific tasks")}</div></div>);
      case 3: return (
        <div className="space-y-6"><div className="flex items-center mb-4"><Users className="mr-2 text-green-600" size={24} /><h3 className="text-lg font-semibold">Identity Profiling</h3></div><div className="space-y-4">{renderRatingScale(skiveRatings.identity.professionalRole,(val) => setSkiveRatings({...skiveRatings, identity: {...skiveRatings.identity, professionalRole: val}}}),"Professional Role Adoption","Embracing characteristic professional roles")}{renderRatingScale(skiveRatings.identity.communityBelonging,(val) => setSkiveRatings({...skiveRatings, identity: {...skiveRatings.identity, communityBelonging: val}}}),"Community Belonging","Sense of belonging within the professional community")}{renderRatingScale(skiveRatings.identity.selfEfficacy,(val) => setSkiveRatings({...skiveRatings, identity: {...skiveRatings.identity, selfEfficacy: val}}}),"Professional Self-Efficacy","Confidence in professional capabilities")}</div></div>);
      case 4: return (
        <div className="space-y-6"><div className="flex items-center mb-4"><Heart className="mr-2 text-purple-600" size={24} /><h3 className="text-lg font-semibold">Values Assessment</h3></div><div className="space-y-4">{renderRatingScale(skiveRatings.values.coreValues,(val) => setSkiveRatings({...skiveRatings, values: {...skiveRatings.values, coreValues: val}}}),"Core Professional Values","Fundamental values like patient well-being, innovation")}{renderRatingScale(skiveRatings.values.epistemicValues,(val) => setSkiveRatings({...skiveRatings, values: {...skiveRatings.values, epistemicValues: val}}}),"Epistemic Values","Values related to knowledge and evidence")}</div></div>);
      case 5: return (
        <div className="space-y-6"><div className="flex items-center mb-4"><Shield className="mr-2 text-red-600" size={24} /><h3 className="text-lg font-semibold">Ethics Evaluation</h3></div><div className="space-y-4">{renderRatingScale(skiveRatings.ethics.deontological,(val) => setSkiveRatings({...skiveRatings, ethics: {...skiveRatings.ethics, deontological: val}}}),"Deontological Principles","Adherence to professional codes and duties")}{renderRatingScale(skiveRatings.ethics.consequentialist,(val) => setSkiveRatings({...skiveRatings, ethics: {...skiveRatings.ethics, consequentialist: val}}}),"Consequentialist Reasoning","Considering outcomes in decision-making")}{renderRatingScale(skiveRatings.ethics.virtue,(val) => setSkiveRatings({...skiveRatings, ethics: {...skiveRatings.ethics, virtue: val}}}),"Virtue Ethics","Character traits like integrity, responsibility")}</div></div>);
      case 6: return (
        <div className="space-y-6">
          <div className="flex items-center mb-4"><Eye className="mr-2 text-indigo-600" size={24} /><h3 className="text-lg font-semibold">SKIVE Profile Summary</h3></div>
          <div className="bg-gray-100 p-6 rounded-lg"><h4 className="font-semibold mb-2">Role: {roleData.specificRole || 'Undefined'}</h4><p className="text-gray-600 mb-4">{roleData.profession}</p><p className="text-sm text-gray-700">{roleData.description}</p></div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border"><h4 className="font-semibold mb-4 text-center">SKIVE Radar Chart</h4><ResponsiveContainer width="100%" height={300}><RadarChart data={getAggregatedScores()}><PolarGrid /><PolarAngleAxis dataKey="subject" /><PolarRadiusAxis angle={90} domain={[0, 3]} tick={false} axisLine={false} /><Radar name="Proficiency" dataKey="A" stroke="#2563eb" fill="#2563eb" fillOpacity={0.4} strokeWidth={2} /></RadarChart></ResponsiveContainer></div>
            <div className="space-y-4"><h4 className="font-semibold">Potential Archetype Match</h4><div className="space-y-3">{archetypes.map((archetype, idx) => (<div key={idx} className={`p-3 border rounded-lg cursor-pointer transition-all ${selectedArchetype === idx ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 bg-white hover:border-gray-300'}`} onClick={() => setSelectedArchetype(selectedArchetype === idx ? null : idx)} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedArchetype(selectedArchetype === idx ? null : idx)}><h5 className="font-medium text-gray-800">{archetype.name}</h5><p className="text-sm text-gray-600">{archetype.description}</p>{selectedArchetype === idx && (<div className="mt-2 pt-2 border-t text-xs text-gray-700"><p><strong>Examples:</strong> {archetype.examples.join(', ')}</p></div>)}</div>))}</div></div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4 border-t">
              <div className="flex gap-4">
                  <button onClick={handleSaveProfile} disabled={saveStatus.loading} className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400"><Save className="mr-2" size={16} />{saveStatus.loading ? 'Saving...' : 'Save Profile'}</button>
                  <button className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"><Download className="mr-2" size={16} />Export Report</button>
              </div>
              {saveStatus.message && (<div className={`mt-2 sm:mt-0 text-sm font-medium ${saveStatus.isError ? 'text-red-600' : 'text-green-600'}`}>{saveStatus.message}</div>)}
          </div>
        </div>);
      default: return <div>Step not found</div>;
    }
  };

  return (
    <>
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold text-gray-800">Stage 1: SKIVE Role Profiling</h2>
          <span className="text-sm font-medium text-blue-600">Step {currentStep + 1} of {steps.length}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${((currentStep) / (steps.length - 1)) * 100}%` }}></div>
        </div>
        <div className="flex justify-between mt-2 text-xs">{steps.map((step, idx) => (<span key={idx} className={`w-1/${steps.length} text-center ${idx <= currentStep ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>{step}</span>))}</div>
      </div>
      <div className="p-6">{renderStepContent()}</div>
      <div className="px-6 py-4 border-t border-gray-200 flex justify-between bg-gray-50">
        <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0} className="px-6 py-2 text-gray-700 font-semibold bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50">Previous</button>
        {currentStep === steps.length - 1 ? (
            <button onClick={onComplete} className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 flex items-center gap-2">Proceed to Stage 2 <ChevronsRight size={18} /></button>
        ) : (
            <button onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">Next</button>
        )}
      </div>
    </>
  );
};


// --- Stage 2: ALE Designer Component ---
const ALEDesigner = ({ roleData, skiveRatings, aleDesign, setAleDesign, onBack }) => {
    const [aiStates, setAiStates] = useState({});

    const prioritizedCompetencies = useMemo(() => {
        const competencies: { category: string; subCategory: string; name: string; value: number; id: string; }[] = [];
        for (const [category, domain] of Object.entries(skiveRatings)) {
            // Check if this domain has sub-categories (like skills.cognitive) or is flat (like identity)
            const firstValue = Object.values(domain)[0];
            const isNested = typeof firstValue === 'object' && firstValue !== null;

            if (isNested) {
                for (const [subCategory, items] of Object.entries(domain)) {
                    for (const [name, value] of Object.entries(items as Record<string, number>)) {
                        if (value > 1) {
                            competencies.push({ category, subCategory, name, value, id: `${category}-${subCategory}-${name}` });
                        }
                    }
                }
            } else {
                for (const [name, value] of Object.entries(domain as Record<string, number>)) {
                    if (value > 1) {
                        competencies.push({ category, subCategory: category, name, value, id: `${category}-${name}` });
                    }
                }
            }
        }
        return competencies.sort((a, b) => b.value - a.value);
    }, [skiveRatings]);

    const handleSuggestObjective = async (competency) => {
        setAiStates(prev => ({ ...prev, [competency.id]: { loading: true, error: null } }));
        try {
            const prompt = `You are an expert in instructional design for serious games. For a professional role of "${roleData.specificRole}" in the field of "${roleData.profession}", generate one concise SMART (Specific, Measurable, Achievable, Relevant, Time-bound) learning objective. The objective should target the sub-competency "${competency.name}" within the SKIVE dimension "${competency.category}". The role is described as: "${roleData.description}".`;
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-preview-04-17',
                contents: prompt,
            });
            const text = response.text;
            setAleDesign(prev => ({ ...prev, learningObjectives: { ...prev.learningObjectives, [competency.id]: text } }));
        } catch (error) {
            console.error("Gemini API error:", error);
            setAiStates(prev => ({ ...prev, [competency.id]: { loading: false, error: 'Failed to generate suggestion.' } }));
        } finally {
            setAiStates(prev => ({ ...prev, [competency.id]: { ...prev[competency.id], loading: false } }));
        }
    };
    
    const handleComponentSelection = (group, feature, component, isChecked) => {
        setAleDesign(prev => {
            const newSelection = { ...(prev[group] || {}) };
            const currentFeatureSet = new Set(newSelection[feature] || []);
            if (isChecked) {
                currentFeatureSet.add(component);
            } else {
                currentFeatureSet.delete(component);
            }
            newSelection[feature] = Array.from(currentFeatureSet);
            return { ...prev, [group]: newSelection };
        });
    };

    return (
        <>
            <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">Stage 2: Design the Authentic Learning Environment (ALE)</h2>
                <p className="text-sm text-gray-600">Translate the role profile into a conceptual game design.</p>
            </div>
            <div className="p-6 space-y-8">
                {/* Learning Objectives */}
                <section>
                    <h3 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">1. Prioritized Competencies & Learning Objectives</h3>
                    <p className="text-sm text-gray-600 mb-4">Based on your profile, here are the competencies rated Medium or High. Use the AI assistant to generate SMART learning objectives for your game.</p>
                    <div className="space-y-4">
                        {prioritizedCompetencies.map(c => (
                            <div key={c.id} className="p-4 bg-gray-50 rounded-lg border">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="text-sm font-semibold text-gray-500 uppercase">{c.subCategory === c.category ? c.category : `${c.category} / ${c.subCategory}`}</div>
                                        <h4 className="font-semibold text-lg text-gray-900 capitalize">{c.name.replace(/([A-Z])/g, ' $1')}</h4>
                                    </div>
                                    <span className={`px-2 py-0.5 text-sm font-semibold rounded-full ${c.value === 3 ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {c.value === 3 ? 'High' : 'Medium'}
                                    </span>
                                </div>
                                <div className="mt-3">
                                    <textarea
                                        value={aleDesign.learningObjectives[c.id] || ''}
                                        onChange={(e) => setAleDesign(prev => ({ ...prev, learningObjectives: { ...prev.learningObjectives, [c.id]: e.target.value } }))}
                                        placeholder="Define a SMART learning objective..."
                                        rows="2"
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                    <div className="flex items-center justify-end mt-2">
                                         {aiStates[c.id]?.error && <span className="text-xs text-red-500 mr-4">{aiStates[c.id].error}</span>}
                                        <button onClick={() => handleSuggestObjective(c)} disabled={aiStates[c.id]?.loading} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 disabled:opacity-60 disabled:cursor-wait">
                                            <Sparkles size={14} />
                                            {aiStates[c.id]?.loading ? 'Generating...' : 'Suggest Objective'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
                
                {/* ALE Features */}
                <section>
                    <h3 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">2. Map ALE Features to Game Components</h3>
                     <p className="text-sm text-gray-600 mb-4">Select the game design components that will help you realize the core features of an Authentic Learning Environment.</p>
                    <div className="space-y-4">
                        {aleFeaturesData.map(featureItem => (
                            <details key={featureItem.feature} className="p-4 bg-white rounded-lg border group" open>
                                <summary className="font-semibold text-lg cursor-pointer list-none flex justify-between items-center">
                                    {featureItem.feature}
                                    <span className="text-gray-400 group-open:rotate-90 transition-transform">▶</span>
                                </summary>
                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {featureItem.components.map(comp => (
                                        <label key={comp} className="flex items-center p-2 space-x-3 bg-gray-50 rounded-md hover:bg-gray-100">
                                            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" onChange={(e) => handleComponentSelection('selectedAleComponents', featureItem.feature, comp, e.target.checked)} checked={aleDesign.selectedAleComponents?.[featureItem.feature]?.includes(comp) || false} />
                                            <span className="text-sm text-gray-700">{comp}</span>
                                        </label>
                                    ))}
                                </div>
                            </details>
                        ))}
                    </div>
                </section>

                 {/* SKIVE Approaches */}
                <section>
                    <h3 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">3. Map SKIVE Aspects to Game Approaches</h3>
                    <p className="text-sm text-gray-600 mb-4">Select specific game design approaches that align with the core SKIVE dimensions of your role profile.</p>
                     <div className="space-y-4">
                        {skiveGameApproachesData.map(aspectItem => (
                             <details key={aspectItem.aspect} className="p-4 bg-white rounded-lg border group" open>
                                <summary className="font-semibold text-lg cursor-pointer list-none flex justify-between items-center">
                                    {aspectItem.aspect}
                                    <span className="text-gray-400 group-open:rotate-90 transition-transform">▶</span>
                                </summary>
                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {aspectItem.approaches.map(appr => (
                                        <label key={appr} className="flex items-center p-2 space-x-3 bg-gray-50 rounded-md hover:bg-gray-100">
                                            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" onChange={(e) => handleComponentSelection('selectedSkiveApproaches', aspectItem.aspect, appr, e.target.checked)} checked={aleDesign.selectedSkiveApproaches?.[aspectItem.aspect]?.includes(appr) || false} />
                                            <span className="text-sm text-gray-700">{appr}</span>
                                        </label>
                                    ))}
                                </div>
                            </details>
                        ))}
                    </div>
                </section>

            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
                <button onClick={onBack} className="flex items-center gap-2 px-6 py-2 text-gray-700 font-semibold bg-white border border-gray-300 rounded-lg hover:bg-gray-100">
                    <ArrowLeft size={18} />
                    Back to Profiler
                </button>
                 <div className="flex gap-4">
                    <button className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"><Save className="mr-2" size={16} />Save Design</button>
                    <button className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Download className="mr-2" size={16} />Export Design</button>
                </div>
            </div>
        </>
    );
};


const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <PrismApp />
    </React.StrictMode>
  );
}
