/**
 * Evaluation test set for French administrative procedure RAG.
 *
 * Each case has:
 * - query: user question (in the specified language)
 * - language: query language code
 * - expectedTopics: keywords/phrases that SHOULD appear in retrieved sources
 * - expectedInResponse: keywords that SHOULD appear in the final answer
 * - forbiddenInResponse: things that should NOT appear (hallucination traps)
 * - category: question type for reporting
 */

export interface EvalCase {
  id: string;
  query: string;
  language: string;
  expectedTopics: string[];
  expectedInResponse: string[];
  forbiddenInResponse?: string[];
  category:
    | 'titre_de_sejour'
    | 'caf'
    | 'cpam'
    | 'tax'
    | 'visa'
    | 'housing'
    | 'work'
    | 'general';
}

export const TEST_SET: EvalCase[] = [
  // --- Titre de séjour ---
  {
    id: 'tds-01',
    query: 'How do I renew my titre de séjour?',
    language: 'en',
    expectedTopics: ['titre de séjour', 'renouvellement', 'préfecture'],
    expectedInResponse: ['préfecture', 'renewal', 'récépissé'],
    category: 'titre_de_sejour',
  },
  {
    id: 'tds-02',
    query: 'Comment renouveler mon titre de séjour salarié ?',
    language: 'fr',
    expectedTopics: ['titre de séjour', 'salarié', 'CESEDA'],
    expectedInResponse: ['salarié', 'contrat de travail', 'renouvellement'],
    category: 'titre_de_sejour',
  },
  {
    id: 'tds-03',
    query: '체류증 갱신 시 필요한 서류는?',
    language: 'ko',
    expectedTopics: ['titre de séjour', 'renouvellement', 'documents'],
    expectedInResponse: ['passeport', 'justificatif'],
    category: 'titre_de_sejour',
  },

  // --- CAF ---
  {
    id: 'caf-01',
    query: 'What documents do I need to apply for CAF?',
    language: 'en',
    expectedTopics: ['CAF', 'aide au logement', 'APL'],
    expectedInResponse: ['CAF', 'APL'],
    category: 'caf',
  },
  {
    id: 'caf-02',
    query: 'Est-ce que les étudiants étrangers ont droit à l\'APL ?',
    language: 'fr',
    expectedTopics: ['APL', 'étudiant', 'titre de séjour'],
    expectedInResponse: ['APL', 'étudiant'],
    category: 'caf',
  },

  // --- CPAM ---
  {
    id: 'cpam-01',
    query: 'How to register with CPAM as a foreigner?',
    language: 'en',
    expectedTopics: ['CPAM', 'sécurité sociale', 'PUMA'],
    expectedInResponse: ['CPAM', 'carte vitale'],
    category: 'cpam',
  },
  {
    id: 'cpam-02',
    query: 'CPAM 등록은 어떻게 하나요?',
    language: 'ko',
    expectedTopics: ['CPAM', 'sécurité sociale', 'affiliation'],
    expectedInResponse: ['CPAM', 'carte vitale'],
    category: 'cpam',
  },

  // --- Tax ---
  {
    id: 'tax-01',
    query: 'First tax declaration in France — what do I need?',
    language: 'en',
    expectedTopics: ['impôt', 'déclaration', 'revenus'],
    expectedInResponse: ['impots.gouv.fr', 'déclaration'],
    category: 'tax',
  },
  {
    id: 'tax-02',
    query: 'Quand doit-on faire sa première déclaration d\'impôts ?',
    language: 'fr',
    expectedTopics: ['déclaration', 'impôt sur le revenu', 'calendrier'],
    expectedInResponse: ['mai', 'déclaration'],
    category: 'tax',
  },

  // --- Visa ---
  {
    id: 'visa-01',
    query: 'What is the difference between a visa long séjour and a carte de séjour?',
    language: 'en',
    expectedTopics: ['visa long séjour', 'carte de séjour', 'VLS-TS'],
    expectedInResponse: ['VLS-TS', 'visa'],
    category: 'visa',
  },

  // --- Work ---
  {
    id: 'work-01',
    query: 'Can I work with a student visa in France?',
    language: 'en',
    expectedTopics: ['étudiant', 'travail', 'autorisation'],
    expectedInResponse: ['964 hours', '60%'],
    forbiddenInResponse: ['unlimited work'],
    category: 'work',
  },

  // --- General / out of scope ---
  {
    id: 'gen-01',
    query: 'What is the best restaurant in Paris?',
    language: 'en',
    expectedTopics: [],
    expectedInResponse: ['administrative', 'procedures'],
    category: 'general',
  },
];
