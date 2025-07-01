-- PRISM Framework Database Schema
-- Version 1.0

-- This table stores the main information about a professional role profile.
CREATE TABLE IF NOT EXISTS profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profession VARCHAR(255) NOT NULL,
    specific_role VARCHAR(255) NOT NULL,
    description TEXT,
    archetype VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- This table stores the detailed SKIVE ratings associated with a profile.
-- It uses a one-to-one relationship with the 'profiles' table.
CREATE TABLE IF NOT EXISTS skive_ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profile_id INT NOT NULL,

    -- Skills
    skills_cognitive_analytical INT,
    skills_cognitive_decisionMaking INT,
    skills_cognitive_strategicPlanning INT,
    skills_cognitive_criticalEvaluation INT,
    skills_interpersonal_communication INT,
    skills_interpersonal_collaboration INT,
    skills_interpersonal_empathy INT,
    skills_interpersonal_negotiation INT,
    skills_psychomotor_precision INT,
    skills_psychomotor_proceduralExecution INT,
    skills_psychomotor_coordination INT,
    skills_metacognitive_reflection INT,
    skills_metacognitive_adaptability INT,
    skills_metacognitive_selfRegulation INT,

    -- Knowledge
    knowledge_declarative_conceptual INT,
    knowledge_declarative_factual INT,
    knowledge_declarative_theoretical INT,
    knowledge_procedural_methods INT,
    knowledge_procedural_processes INT,
    knowledge_procedural_techniques INT,
    knowledge_conditional_whenToApply INT,
    knowledge_conditional_contextualUse INT,
    
    -- Identity
    identity_professionalRole INT,
    identity_communityBelonging INT,
    identity_selfEfficacy INT,
    identity_dispositions INT,

    -- Values
    values_coreValues INT,
    values_epistemicValues INT,
    values_stakeholderValues INT,
    
    -- Ethics
    ethics_deontological INT,
    ethics_consequentialist INT,
    ethics_virtue INT,
    
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);