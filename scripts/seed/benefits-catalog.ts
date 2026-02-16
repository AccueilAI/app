/**
 * Seed script for benefits catalog.
 * Run: pnpm tsx scripts/seed/benefits-catalog.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

interface SeedBenefit {
  slug: string;
  category: string;
  name_fr: string;
  name_en: string;
  name_ko: string;
  description_fr: string;
  description_en: string;
  description_ko: string;
  eligibility_rules: Record<string, unknown>;
  how_to_apply: Record<string, unknown>;
  official_url: string | null;
  estimated_amount: string | null;
  processing_time: string | null;
}

const BENEFITS: SeedBenefit[] = [
  // ============================================================
  // HOUSING (6)
  // ============================================================
  {
    slug: 'apl',
    category: 'housing',
    name_fr: "Aide Personnalisée au Logement (APL)",
    name_en: "Personalized Housing Aid (APL)",
    name_ko: "개인 주거 보조금 (APL)",
    description_fr: "Aide financière pour réduire le montant du loyer ou de la mensualité d'emprunt immobilier. Versée par la CAF.",
    description_en: "Financial aid to reduce rent or mortgage payments. Paid by CAF (family benefits fund).",
    description_ko: "임대료 또는 주택 대출 상환액을 줄여주는 재정 지원. CAF에서 지급.",
    eligibility_rules: { visa_types: ['any'], requires_legal_residency: true },
    how_to_apply: {
      steps_fr: ["Créer un compte sur caf.fr", "Remplir la demande en ligne", "Fournir bail et RIB"],
      steps_en: ["Create account on caf.fr", "Fill online application", "Provide lease and bank details"],
      steps_ko: ["caf.fr에서 계정 생성", "온라인 신청서 작성", "임대차 계약서 및 은행 정보 제출"],
      documents: ["Titre de séjour", "Bail/contrat de location", "RIB", "Avis d'imposition"],
    },
    official_url: "https://www.caf.fr/allocataires/droits-et-prestations/s-informer-sur-les-aides/logement-et-cadre-de-vie/les-aides-au-logement",
    estimated_amount: "€50–€300/mois",
    processing_time: "2-4 semaines",
  },
  {
    slug: 'als',
    category: 'housing',
    name_fr: "Allocation de Logement Sociale (ALS)",
    name_en: "Social Housing Allowance (ALS)",
    name_ko: "사회 주거 수당 (ALS)",
    description_fr: "Aide au logement pour les personnes non éligibles à l'APL. Souvent pour les étudiants et jeunes travailleurs.",
    description_en: "Housing aid for those not eligible for APL. Often for students and young workers.",
    description_ko: "APL 자격이 안 되는 사람을 위한 주거 지원. 주로 학생 및 청년 근로자 대상.",
    eligibility_rules: { visa_types: ['any'], requires_legal_residency: true },
    how_to_apply: {
      steps_fr: ["Demande via caf.fr", "Joindre bail et justificatifs"],
      steps_en: ["Apply via caf.fr", "Attach lease and supporting documents"],
      steps_ko: ["caf.fr에서 신청", "임대 계약서 및 증빙 서류 첨부"],
      documents: ["Titre de séjour", "Bail", "RIB", "Attestation de scolarité (étudiants)"],
    },
    official_url: "https://www.caf.fr/allocataires/droits-et-prestations/s-informer-sur-les-aides/logement-et-cadre-de-vie/les-aides-au-logement",
    estimated_amount: "€50–€250/mois",
    processing_time: "2-4 semaines",
  },
  {
    slug: 'alf',
    category: 'housing',
    name_fr: "Allocation de Logement Familiale (ALF)",
    name_en: "Family Housing Allowance (ALF)",
    name_ko: "가족 주거 수당 (ALF)",
    description_fr: "Aide au logement pour les familles avec enfants ou couples mariés depuis moins de 5 ans.",
    description_en: "Housing aid for families with children or couples married less than 5 years.",
    description_ko: "자녀가 있는 가족 또는 결혼 5년 미만 부부를 위한 주거 지원.",
    eligibility_rules: { visa_types: ['any'], requires_legal_residency: true, has_children: true },
    how_to_apply: {
      steps_fr: ["Demande via caf.fr", "Joindre livret de famille"],
      steps_en: ["Apply via caf.fr", "Attach family booklet"],
      steps_ko: ["caf.fr에서 신청", "가족 증명서 첨부"],
      documents: ["Titre de séjour", "Livret de famille", "Bail", "RIB"],
    },
    official_url: "https://www.caf.fr/allocataires/droits-et-prestations/s-informer-sur-les-aides/logement-et-cadre-de-vie/les-aides-au-logement",
    estimated_amount: "€50–€300/mois",
    processing_time: "2-4 semaines",
  },
  {
    slug: 'visale',
    category: 'housing',
    name_fr: "Garantie Visale",
    name_en: "Visale Guarantee",
    name_ko: "비잘 보증 (Visale)",
    description_fr: "Caution locative gratuite par Action Logement. Couvre les impayés de loyer pour le propriétaire.",
    description_en: "Free rental guarantee by Action Logement. Covers unpaid rent for the landlord.",
    description_ko: "Action Logement 무료 임대 보증. 집주인에게 미납 임대료를 보장.",
    eligibility_rules: { visa_types: ['any'], requires_legal_residency: true, age_range: { min: 18, max: 30 } },
    how_to_apply: {
      steps_fr: ["Créer un compte sur visale.fr", "Demander un visa Visale", "Transmettre au propriétaire"],
      steps_en: ["Create account on visale.fr", "Request Visale visa", "Share with landlord"],
      steps_ko: ["visale.fr에서 계정 생성", "Visale 비자 요청", "집주인에게 전달"],
      documents: ["Pièce d'identité", "Justificatif de revenus ou attestation de scolarité"],
    },
    official_url: "https://www.visale.fr/",
    estimated_amount: "Gratuit (garantie)",
    processing_time: "2-3 jours",
  },
  {
    slug: 'loca-pass',
    category: 'housing',
    name_fr: "Avance LOCA-PASS",
    name_en: "LOCA-PASS Advance",
    name_ko: "LOCA-PASS 선불금",
    description_fr: "Prêt à taux zéro pour le dépôt de garantie. Maximum 1 200 €, remboursable en 25 mois.",
    description_en: "Interest-free loan for security deposit. Max €1,200, repayable over 25 months.",
    description_ko: "보증금을 위한 무이자 대출. 최대 €1,200, 25개월 분할 상환.",
    eligibility_rules: { visa_types: ['any'], requires_legal_residency: true, requires_employment: true },
    how_to_apply: {
      steps_fr: ["Demande en ligne sur actionlogement.fr", "Fournir contrat de travail et bail"],
      steps_en: ["Apply online at actionlogement.fr", "Provide employment contract and lease"],
      steps_ko: ["actionlogement.fr에서 온라인 신청", "근로 계약서 및 임대 계약서 제출"],
      documents: ["Contrat de travail", "Bail", "RIB"],
    },
    official_url: "https://www.actionlogement.fr/l-avance-loca-pass",
    estimated_amount: "Jusqu'à €1 200",
    processing_time: "1-2 semaines",
  },
  {
    slug: 'fsl',
    category: 'housing',
    name_fr: "Fonds de Solidarité pour le Logement (FSL)",
    name_en: "Housing Solidarity Fund (FSL)",
    name_ko: "주거 연대 기금 (FSL)",
    description_fr: "Aide financière d'urgence pour accéder ou maintenir un logement. Gérée par le département.",
    description_en: "Emergency financial aid to access or maintain housing. Managed by the department.",
    description_ko: "주거 접근 또는 유지를 위한 긴급 재정 지원. 도(département) 관할.",
    eligibility_rules: { visa_types: ['any'], requires_legal_residency: true },
    how_to_apply: {
      steps_fr: ["Contacter le CCAS ou une assistante sociale", "Remplir le formulaire FSL du département"],
      steps_en: ["Contact CCAS or social worker", "Fill department FSL form"],
      steps_ko: ["CCAS 또는 사회복지사 연락", "도의 FSL 신청서 작성"],
      documents: ["Titre de séjour", "Justificatifs de ressources", "Quittances de loyer"],
    },
    official_url: null,
    estimated_amount: "Variable (€100–€2 000)",
    processing_time: "2-6 semaines",
  },

  // ============================================================
  // HEALTHCARE (5)
  // ============================================================
  {
    slug: 'puma',
    category: 'healthcare',
    name_fr: "Protection Universelle Maladie (PUMa)",
    name_en: "Universal Health Coverage (PUMa)",
    name_ko: "보편적 건강 보험 (PUMa)",
    description_fr: "Couverture maladie de base pour toute personne résidant en France de manière stable et régulière.",
    description_en: "Basic health coverage for anyone living in France stably and legally.",
    description_ko: "프랑스에 안정적이고 합법적으로 거주하는 모든 사람을 위한 기본 건강 보험.",
    eligibility_rules: { visa_types: ['any'], requires_legal_residency: true, min_residency_months: 3 },
    how_to_apply: {
      steps_fr: ["S'inscrire à la CPAM", "Fournir titre de séjour et justificatif de domicile"],
      steps_en: ["Register with CPAM", "Provide residence permit and proof of address"],
      steps_ko: ["CPAM에 등록", "체류증 및 거주 증명 제출"],
      documents: ["Titre de séjour", "Justificatif de domicile", "RIB", "Acte de naissance"],
    },
    official_url: "https://www.ameli.fr/assure/droits-demarches/principes/protection-universelle-maladie",
    estimated_amount: "Couverture 70% soins",
    processing_time: "1-3 mois",
  },
  {
    slug: 'css',
    category: 'healthcare',
    name_fr: "Complémentaire Santé Solidaire (CSS)",
    name_en: "Complementary Solidarity Health Insurance (CSS)",
    name_ko: "보완 건강 연대 보험 (CSS)",
    description_fr: "Complémentaire santé gratuite ou à faible coût pour les ménages à revenus modestes.",
    description_en: "Free or low-cost supplementary health insurance for low-income households.",
    description_ko: "저소득 가구를 위한 무료 또는 저렴한 보완 건강 보험.",
    eligibility_rules: { visa_types: ['any'], requires_legal_residency: true, max_income: 14000 },
    how_to_apply: {
      steps_fr: ["Faire une simulation sur ameli.fr", "Déposer la demande à la CPAM"],
      steps_en: ["Run simulation on ameli.fr", "Submit application at CPAM"],
      steps_ko: ["ameli.fr에서 시뮬레이션", "CPAM에 신청서 제출"],
      documents: ["Avis d'imposition", "Justificatif de revenus", "Titre de séjour"],
    },
    official_url: "https://www.ameli.fr/assure/droits-demarches/difficultes-acces-droits-soins/complementaire-sante-solidaire",
    estimated_amount: "Gratuit (≤€10 339) ou €8–€30/mois (≤€13 957)",
    processing_time: "2-4 semaines",
  },
  {
    slug: 'ame',
    category: 'healthcare',
    name_fr: "Aide Médicale de l'État (AME)",
    name_en: "State Medical Aid (AME)",
    name_ko: "국가 의료 보조 (AME)",
    description_fr: "Couverture maladie pour les personnes en situation irrégulière résidant en France depuis plus de 3 mois.",
    description_en: "Health coverage for undocumented residents in France for more than 3 months.",
    description_ko: "3개월 이상 프랑스에 거주하는 미등록 이주민을 위한 건강 보험.",
    eligibility_rules: { min_residency_months: 3, max_income: 10000 },
    how_to_apply: {
      steps_fr: ["Retirer un dossier à la CPAM", "Joindre justificatifs d'identité et de résidence"],
      steps_en: ["Get form from CPAM", "Attach ID and residence proof"],
      steps_ko: ["CPAM에서 서류 수령", "신분증 및 거주 증명 첨부"],
      documents: ["Passeport", "Justificatif de domicile (3 mois)", "Justificatif de ressources"],
    },
    official_url: "https://www.ameli.fr/assure/droits-demarches/situations-particulieres/aide-medicale-etat-ame",
    estimated_amount: "Couverture 100%",
    processing_time: "1-2 mois",
  },
  {
    slug: 'bilan-sante',
    category: 'healthcare',
    name_fr: "Bilan de Santé Gratuit",
    name_en: "Free Health Checkup",
    name_ko: "무료 건강 검진",
    description_fr: "Examen de santé complet et gratuit proposé tous les 5 ans par la Sécurité Sociale.",
    description_en: "Free comprehensive health checkup offered every 5 years by Social Security.",
    description_ko: "사회보장에서 5년마다 제공하는 무료 종합 건강 검진.",
    eligibility_rules: { visa_types: ['any'], requires_legal_residency: true },
    how_to_apply: {
      steps_fr: ["Contacter la CPAM pour prendre rendez-vous", "Se présenter au centre d'examen"],
      steps_en: ["Contact CPAM to book appointment", "Visit examination center"],
      steps_ko: ["CPAM에 연락하여 예약", "검진 센터 방문"],
      documents: ["Carte Vitale ou attestation CPAM"],
    },
    official_url: "https://www.ameli.fr/assure/sante/assurance-maladie/examen-periodique-sante",
    estimated_amount: "Gratuit",
    processing_time: "1-4 semaines (rdv)",
  },
  {
    slug: 'aide-optique-dentaire',
    category: 'healthcare',
    name_fr: "Reste à Charge Zéro (100% Santé)",
    name_en: "Zero Out-of-Pocket (100% Santé)",
    name_ko: "본인 부담 제로 (100% Santé)",
    description_fr: "Lunettes, prothèses dentaires et aides auditives entièrement prises en charge.",
    description_en: "Glasses, dental prosthetics, and hearing aids fully covered.",
    description_ko: "안경, 치과 보철물, 보청기를 전액 보장.",
    eligibility_rules: { visa_types: ['any'], requires_legal_residency: true },
    how_to_apply: {
      steps_fr: ["Consulter un professionnel de santé", "Choisir les offres 100% Santé"],
      steps_en: ["Consult a healthcare professional", "Choose 100% Santé offers"],
      steps_ko: ["의료 전문가 상담", "100% Santé 상품 선택"],
      documents: ["Carte Vitale", "Mutuelle/complémentaire santé"],
    },
    official_url: "https://www.ameli.fr/assure/remboursements/reste-charge-zero",
    estimated_amount: "Gratuit (panier 100% Santé)",
    processing_time: "Immédiat",
  },

  // ============================================================
  // FINANCIAL (8)
  // ============================================================
  {
    slug: 'rsa',
    category: 'financial',
    name_fr: "Revenu de Solidarité Active (RSA)",
    name_en: "Active Solidarity Income (RSA)",
    name_ko: "적극 연대 소득 (RSA)",
    description_fr: "Revenu minimum pour les personnes sans ressources ou à faibles revenus. Conditions spécifiques pour les étrangers.",
    description_en: "Minimum income for people with no or low resources. Specific conditions for foreigners.",
    description_ko: "무소득 또는 저소득자를 위한 최저 소득. 외국인에게 특별 조건 적용.",
    eligibility_rules: { visa_types: ['any'], requires_legal_residency: true, min_residency_months: 60, age_range: { min: 25, max: null } },
    how_to_apply: {
      steps_fr: ["Simulation sur caf.fr", "Déposer demande en ligne ou au CCAS"],
      steps_en: ["Simulate on caf.fr", "Apply online or at CCAS"],
      steps_ko: ["caf.fr에서 시뮬레이션", "온라인 또는 CCAS에서 신청"],
      documents: ["Titre de séjour (5 ans)", "Avis d'imposition", "RIB"],
    },
    official_url: "https://www.caf.fr/allocataires/droits-et-prestations/s-informer-sur-les-aides/solidarite-et-insertion/le-revenu-de-solidarite-active-rsa",
    estimated_amount: "€647/mois (personne seule)",
    processing_time: "2-4 semaines",
  },
  {
    slug: 'prime-activite',
    category: 'financial',
    name_fr: "Prime d'Activité",
    name_en: "Activity Bonus",
    name_ko: "근로 장려금 (Prime d'Activité)",
    description_fr: "Complément de revenus pour les travailleurs aux revenus modestes. Calculé trimestriellement.",
    description_en: "Income supplement for low-income workers. Calculated quarterly.",
    description_ko: "저소득 근로자를 위한 소득 보충. 분기별 계산.",
    eligibility_rules: { visa_types: ['any'], requires_legal_residency: true, requires_employment: true, age_range: { min: 18, max: null } },
    how_to_apply: {
      steps_fr: ["Simulation sur caf.fr", "Demande en ligne", "Déclaration trimestrielle"],
      steps_en: ["Simulate on caf.fr", "Apply online", "Quarterly declaration"],
      steps_ko: ["caf.fr에서 시뮬레이션", "온라인 신청", "분기 신고"],
      documents: ["Titre de séjour", "Fiches de paie", "Avis d'imposition"],
    },
    official_url: "https://www.caf.fr/allocataires/droits-et-prestations/s-informer-sur-les-aides/solidarite-et-insertion/la-prime-d-activite",
    estimated_amount: "€100–€600/mois",
    processing_time: "2-4 semaines",
  },
  {
    slug: 'ars',
    category: 'financial',
    name_fr: "Allocation de Rentrée Scolaire (ARS)",
    name_en: "Back-to-School Allowance (ARS)",
    name_ko: "신학기 수당 (ARS)",
    description_fr: "Aide annuelle versée en août pour les frais de rentrée scolaire des enfants de 6 à 18 ans.",
    description_en: "Annual allowance paid in August for back-to-school costs for children aged 6-18.",
    description_ko: "6-18세 자녀의 신학기 비용으로 매년 8월에 지급되는 수당.",
    eligibility_rules: { visa_types: ['any'], requires_legal_residency: true, has_children: true },
    how_to_apply: {
      steps_fr: ["Automatique si allocataire CAF", "Sinon, déposer demande à la CAF"],
      steps_en: ["Automatic if CAF beneficiary", "Otherwise, apply at CAF"],
      steps_ko: ["CAF 수급자인 경우 자동", "아닌 경우 CAF에 신청"],
      documents: ["Certificat de scolarité (16-18 ans)"],
    },
    official_url: "https://www.caf.fr/allocataires/droits-et-prestations/s-informer-sur-les-aides/enfance-et-jeunesse/l-allocation-de-rentree-scolaire-ars",
    estimated_amount: "€398–€434/enfant",
    processing_time: "Automatique (août)",
  },
  {
    slug: 'paje',
    category: 'financial',
    name_fr: "Prestation d'Accueil du Jeune Enfant (PAJE)",
    name_en: "Early Childhood Benefit (PAJE)",
    name_ko: "영유아 양육 지원 (PAJE)",
    description_fr: "Ensemble de prestations pour les parents de jeunes enfants : prime naissance, allocation de base, CMG.",
    description_en: "Set of benefits for parents of young children: birth premium, base allowance, childcare aid.",
    description_ko: "영유아 부모를 위한 종합 급여: 출생 보너스, 기본 수당, 보육 지원.",
    eligibility_rules: { visa_types: ['any'], requires_legal_residency: true, has_children: true },
    how_to_apply: {
      steps_fr: ["Déclarer la grossesse dans les 14 premières semaines", "Fournir les justificatifs à la CAF"],
      steps_en: ["Declare pregnancy within first 14 weeks", "Provide documents to CAF"],
      steps_ko: ["임신 초기 14주 이내 신고", "CAF에 증빙 서류 제출"],
      documents: ["Déclaration de grossesse", "Livret de famille", "Avis d'imposition"],
    },
    official_url: "https://www.caf.fr/allocataires/droits-et-prestations/s-informer-sur-les-aides/petite-enfance",
    estimated_amount: "€171–€1 003/mois",
    processing_time: "2-4 semaines",
  },
  {
    slug: 'af',
    category: 'financial',
    name_fr: "Allocations Familiales (AF)",
    name_en: "Family Allowances (AF)",
    name_ko: "가족 수당 (AF)",
    description_fr: "Allocations versées automatiquement aux familles ayant au moins 2 enfants de moins de 20 ans.",
    description_en: "Allowances automatically paid to families with at least 2 children under 20.",
    description_ko: "20세 미만 자녀 2명 이상 가족에게 자동 지급되는 수당.",
    eligibility_rules: { visa_types: ['any'], requires_legal_residency: true, has_children: true },
    how_to_apply: {
      steps_fr: ["Automatique pour les allocataires CAF avec 2+ enfants"],
      steps_en: ["Automatic for CAF beneficiaries with 2+ children"],
      steps_ko: ["2명 이상 자녀가 있는 CAF 수급자에게 자동 적용"],
      documents: [],
    },
    official_url: "https://www.caf.fr/allocataires/droits-et-prestations/s-informer-sur-les-aides/enfance-et-jeunesse/les-allocations-familiales-af",
    estimated_amount: "€141–€338/mois (2-3 enfants)",
    processing_time: "Automatique",
  },
  {
    slug: 'aah',
    category: 'financial',
    name_fr: "Allocation aux Adultes Handicapés (AAH)",
    name_en: "Disabled Adults Allowance (AAH)",
    name_ko: "장애인 성인 수당 (AAH)",
    description_fr: "Revenu minimum garanti pour les personnes en situation de handicap avec un taux d'incapacité ≥80%.",
    description_en: "Guaranteed minimum income for disabled persons with incapacity rate ≥80%.",
    description_ko: "장애율 80% 이상 장애인을 위한 최저 소득 보장.",
    eligibility_rules: { visa_types: ['any'], requires_legal_residency: true },
    how_to_apply: {
      steps_fr: ["Dossier MDPH", "La CAF verse l'allocation après décision MDPH"],
      steps_en: ["File with MDPH", "CAF pays after MDPH decision"],
      steps_ko: ["MDPH에 서류 제출", "MDPH 결정 후 CAF에서 지급"],
      documents: ["Certificat médical", "Formulaire MDPH", "Titre de séjour"],
    },
    official_url: "https://www.service-public.fr/particuliers/vosdroits/F12242",
    estimated_amount: "€1 033/mois (max)",
    processing_time: "4-6 mois",
  },
  {
    slug: 'aspa',
    category: 'financial',
    name_fr: "Allocation de Solidarité aux Personnes Âgées (ASPA)",
    name_en: "Solidarity Allowance for the Elderly (ASPA)",
    name_ko: "고령자 연대 수당 (ASPA)",
    description_fr: "Minimum vieillesse pour les personnes de 65 ans et plus à faibles revenus.",
    description_en: "Minimum old-age income for persons aged 65+ with low income.",
    description_ko: "65세 이상 저소득 고령자를 위한 최저 노령 소득.",
    eligibility_rules: { visa_types: ['any'], requires_legal_residency: true, min_residency_months: 120, age_range: { min: 65, max: null } },
    how_to_apply: {
      steps_fr: ["Demande auprès de la caisse de retraite"],
      steps_en: ["Apply at pension fund office"],
      steps_ko: ["연금 기관에 신청"],
      documents: ["Titre de séjour (10 ans)", "Avis d'imposition", "Relevé de carrière"],
    },
    official_url: "https://www.service-public.fr/particuliers/vosdroits/F16871",
    estimated_amount: "€1 044/mois (personne seule)",
    processing_time: "2-3 mois",
  },
  {
    slug: 'bourse-crous',
    category: 'financial',
    name_fr: "Bourse sur Critères Sociaux (CROUS)",
    name_en: "CROUS Social Scholarship",
    name_ko: "CROUS 사회적 기준 장학금",
    description_fr: "Bourse d'études pour les étudiants à revenus modestes. 8 échelons selon les ressources familiales.",
    description_en: "Study grant for low-income students. 8 levels based on family income.",
    description_ko: "저소득 학생을 위한 학업 장학금. 가족 소득에 따라 8단계.",
    eligibility_rules: { visa_types: ['student'], requires_legal_residency: true, age_range: { min: 18, max: 28 } },
    how_to_apply: {
      steps_fr: ["Remplir le DSE (Dossier Social Étudiant) sur messervices.etudiant.gouv.fr"],
      steps_en: ["Fill DSE (Student Social File) on messervices.etudiant.gouv.fr"],
      steps_ko: ["messervices.etudiant.gouv.fr에서 DSE 작성"],
      documents: ["Avis d'imposition des parents", "Titre de séjour", "Certificat de scolarité"],
    },
    official_url: "https://www.etudiant.gouv.fr/fr/bourses-sur-criteres-sociaux-702",
    estimated_amount: "€1 454–€6 335/an",
    processing_time: "1-2 mois",
  },

  // ============================================================
  // EMPLOYMENT (6)
  // ============================================================
  {
    slug: 'cpf',
    category: 'employment',
    name_fr: "Compte Personnel de Formation (CPF)",
    name_en: "Personal Training Account (CPF)",
    name_ko: "개인 교육 계좌 (CPF)",
    description_fr: "Droits à la formation professionnelle accumulés chaque année. Utilisable pour des certifications, permis, etc.",
    description_en: "Professional training credits accumulated yearly. Usable for certifications, licenses, etc.",
    description_ko: "매년 적립되는 직업 교육 크레딧. 자격증, 면허 등에 사용 가능.",
    eligibility_rules: { visa_types: ['any'], requires_legal_residency: true, requires_employment: true },
    how_to_apply: {
      steps_fr: ["Créer un compte sur moncompteformation.gouv.fr", "Choisir une formation éligible"],
      steps_en: ["Create account on moncompteformation.gouv.fr", "Choose eligible training"],
      steps_ko: ["moncompteformation.gouv.fr에서 계정 생성", "자격 교육 선택"],
      documents: ["Numéro de Sécurité Sociale", "FranceConnect"],
    },
    official_url: "https://www.moncompteformation.gouv.fr/",
    estimated_amount: "€500/an (plafonné à €5 000)",
    processing_time: "Immédiat (en ligne)",
  },
  {
    slug: 'acre',
    category: 'employment',
    name_fr: "Aide à la Création ou Reprise d'Entreprise (ACRE)",
    name_en: "Business Creation/Takeover Aid (ACRE)",
    name_ko: "창업/인수 지원 (ACRE)",
    description_fr: "Exonération partielle de cotisations sociales pendant 12 mois pour les créateurs d'entreprise.",
    description_en: "Partial social security contribution exemption for 12 months for new business creators.",
    description_ko: "신규 창업자를 위한 12개월간 사회 보장 기여금 부분 면제.",
    eligibility_rules: { visa_types: ['talent', 'salarié', 'family'], requires_legal_residency: true },
    how_to_apply: {
      steps_fr: ["Demande automatique à la création sur guichet-entreprises.fr"],
      steps_en: ["Automatic application when creating business on guichet-entreprises.fr"],
      steps_ko: ["guichet-entreprises.fr에서 사업 등록 시 자동 신청"],
      documents: ["Justificatif d'éligibilité (ARE, RSA, etc.)"],
    },
    official_url: "https://www.service-public.fr/particuliers/vosdroits/F11677",
    estimated_amount: "50% réduction cotisations",
    processing_time: "Automatique",
  },
  {
    slug: 'are',
    category: 'employment',
    name_fr: "Allocation d'Aide au Retour à l'Emploi (ARE)",
    name_en: "Return to Work Allowance (ARE)",
    name_ko: "재취업 지원 수당 (ARE)",
    description_fr: "Indemnisation chômage pour les travailleurs ayant perdu involontairement leur emploi.",
    description_en: "Unemployment benefit for workers who involuntarily lost their job.",
    description_ko: "비자발적으로 실직한 근로자를 위한 실업 급여.",
    eligibility_rules: { visa_types: ['any'], requires_legal_residency: true, requires_employment: false },
    how_to_apply: {
      steps_fr: ["S'inscrire à France Travail dans les 12 mois", "Actualiser chaque mois"],
      steps_en: ["Register at France Travail within 12 months", "Update monthly"],
      steps_ko: ["12개월 이내 France Travail 등록", "매월 갱신"],
      documents: ["Attestation employeur", "Titre de séjour autorisant le travail", "RIB"],
    },
    official_url: "https://www.france-travail.fr/candidat/mes-droits-aux-aides-et-allocations/a-]aide-au-retour-a-l-emploi.html",
    estimated_amount: "57% du salaire brut",
    processing_time: "1-2 semaines",
  },
  {
    slug: 'formation-france-travail',
    category: 'employment',
    name_fr: "Formations France Travail",
    name_en: "France Travail Training Programs",
    name_ko: "France Travail 직업 교육",
    description_fr: "Formations professionnelles gratuites pour les demandeurs d'emploi inscrits à France Travail.",
    description_en: "Free professional training for job seekers registered with France Travail.",
    description_ko: "France Travail에 등록된 구직자를 위한 무료 직업 교육.",
    eligibility_rules: { visa_types: ['any'], requires_legal_residency: true },
    how_to_apply: {
      steps_fr: ["Consulter les offres de formation sur francetravail.fr", "Valider avec son conseiller"],
      steps_en: ["Browse training offers on francetravail.fr", "Validate with your advisor"],
      steps_ko: ["francetravail.fr에서 교육 프로그램 검색", "담당 상담사와 확인"],
      documents: ["Inscription France Travail", "Projet Personnalisé d'Accès à l'Emploi"],
    },
    official_url: "https://www.francetravail.fr/candidat/en-formation.html",
    estimated_amount: "Gratuit + indemnité possible",
    processing_time: "Variable",
  },
  {
    slug: 'aide-mobilite',
    category: 'employment',
    name_fr: "Aide à la Mobilité (France Travail)",
    name_en: "Mobility Assistance (France Travail)",
    name_ko: "이동 지원 (France Travail)",
    description_fr: "Prise en charge des frais de déplacement, hébergement et repas pour une formation ou un entretien.",
    description_en: "Coverage for travel, accommodation and meal costs for training or interviews.",
    description_ko: "교육 또는 면접을 위한 교통, 숙박, 식사 비용 지원.",
    eligibility_rules: { visa_types: ['any'], requires_legal_residency: true },
    how_to_apply: {
      steps_fr: ["Demander à son conseiller France Travail avant le déplacement"],
      steps_en: ["Request from France Travail advisor before travel"],
      steps_ko: ["이동 전 France Travail 상담사에게 요청"],
      documents: ["Convocation/justificatif", "Inscription France Travail"],
    },
    official_url: "https://www.francetravail.fr/candidat/mes-droits-aux-aides-et-allocations/aides-a-la-mobilite.html",
    estimated_amount: "Jusqu'à €5 000/an",
    processing_time: "1-2 semaines",
  },
  {
    slug: 'cir',
    category: 'employment',
    name_fr: "Contrat d'Intégration Républicaine (CIR)",
    name_en: "Republican Integration Contract (CIR)",
    name_ko: "공화국 통합 계약 (CIR)",
    description_fr: "Parcours d'intégration obligatoire pour les primo-arrivants : cours de français et formation civique gratuits.",
    description_en: "Mandatory integration path for newcomers: free French courses and civic training.",
    description_ko: "신규 이민자 필수 통합 과정: 무료 프랑스어 및 시민 교육.",
    eligibility_rules: { visa_types: ['family', 'talent', 'salarié'] },
    how_to_apply: {
      steps_fr: ["Convocation automatique par l'OFII après l'arrivée"],
      steps_en: ["Automatic invitation by OFII after arrival"],
      steps_ko: ["도착 후 OFII에서 자동 소환"],
      documents: ["Visa long séjour", "Passeport"],
    },
    official_url: "https://www.ofii.fr/le-contrat-d-integration-republicaine/",
    estimated_amount: "Gratuit",
    processing_time: "1-3 mois après arrivée",
  },

  // ============================================================
  // LEGAL (5)
  // ============================================================
  {
    slug: 'aide-juridictionnelle',
    category: 'legal',
    name_fr: "Aide Juridictionnelle",
    name_en: "Legal Aid",
    name_ko: "법률 구조 (Aide Juridictionnelle)",
    description_fr: "Prise en charge totale ou partielle des frais de justice pour les personnes à faibles revenus.",
    description_en: "Full or partial coverage of legal costs for low-income individuals.",
    description_ko: "저소득층의 법률 비용 전액 또는 일부 지원.",
    eligibility_rules: { visa_types: ['any'], requires_legal_residency: true, max_income: 12000 },
    how_to_apply: {
      steps_fr: ["Remplir le formulaire CERFA n°16146", "Déposer au tribunal ou bureau d'aide juridictionnelle"],
      steps_en: ["Fill CERFA form n°16146", "Submit at courthouse or legal aid office"],
      steps_ko: ["CERFA 양식 n°16146 작성", "법원 또는 법률 구조 사무소에 제출"],
      documents: ["Avis d'imposition", "Titre de séjour", "Justificatif de domicile"],
    },
    official_url: "https://www.service-public.fr/particuliers/vosdroits/F18074",
    estimated_amount: "100% ou partiel selon revenus",
    processing_time: "1-3 mois",
  },
  {
    slug: 'ofii-integration',
    category: 'legal',
    name_fr: "Accompagnement OFII",
    name_en: "OFII Support Services",
    name_ko: "OFII 통합 지원",
    description_fr: "Services d'accompagnement social et professionnel de l'OFII pour les réfugiés et primo-arrivants.",
    description_en: "Social and professional support services from OFII for refugees and newcomers.",
    description_ko: "난민과 신규 이민자를 위한 OFII 사회적·직업적 지원 서비스.",
    eligibility_rules: { visa_types: ['family', 'talent', 'salarié', 'student'] },
    how_to_apply: {
      steps_fr: ["Contacter la direction territoriale OFII de votre département"],
      steps_en: ["Contact OFII territorial office in your department"],
      steps_ko: ["해당 도의 OFII 지역 사무소에 연락"],
      documents: ["Visa long séjour", "Passeport"],
    },
    official_url: "https://www.ofii.fr/",
    estimated_amount: "Gratuit",
    processing_time: "Variable",
  },
  {
    slug: 'mediation-familiale',
    category: 'legal',
    name_fr: "Médiation Familiale",
    name_en: "Family Mediation",
    name_ko: "가족 중재",
    description_fr: "Aide à la résolution de conflits familiaux par un médiateur agréé. Tarif selon revenus.",
    description_en: "Help resolving family conflicts through a certified mediator. Sliding scale fees.",
    description_ko: "공인 중재인을 통한 가족 갈등 해결 지원. 소득에 따른 요금.",
    eligibility_rules: { visa_types: ['any'] },
    how_to_apply: {
      steps_fr: ["Contacter un service de médiation familiale agréé CAF"],
      steps_en: ["Contact a CAF-approved family mediation service"],
      steps_ko: ["CAF 승인 가족 중재 서비스에 연락"],
      documents: [],
    },
    official_url: "https://www.service-public.fr/particuliers/vosdroits/F34355",
    estimated_amount: "€2–€131/séance",
    processing_time: "1-4 semaines",
  },
  {
    slug: 'droit-sejour-info',
    category: 'legal',
    name_fr: "Point d'Accès au Droit (PAD)",
    name_en: "Legal Access Point (PAD)",
    name_ko: "법률 접근 창구 (PAD)",
    description_fr: "Consultations juridiques gratuites dans les maisons de justice. Droit des étrangers, logement, travail.",
    description_en: "Free legal consultations at justice centers. Immigration law, housing, employment.",
    description_ko: "법원 센터에서 무료 법률 상담. 이민법, 주거, 고용.",
    eligibility_rules: { visa_types: ['any'] },
    how_to_apply: {
      steps_fr: ["Trouver un PAD sur justice.fr", "Prendre rendez-vous ou se rendre sur place"],
      steps_en: ["Find a PAD on justice.fr", "Book appointment or walk in"],
      steps_ko: ["justice.fr에서 PAD 검색", "예약 또는 직접 방문"],
      documents: [],
    },
    official_url: "https://www.justice.fr/recherche/annuaires",
    estimated_amount: "Gratuit",
    processing_time: "1-2 semaines (rdv)",
  },
  {
    slug: 'defenseur-droits',
    category: 'legal',
    name_fr: "Défenseur des Droits",
    name_en: "Rights Defender (Ombudsman)",
    name_ko: "권리 보호관 (옴부즈만)",
    description_fr: "Autorité indépendante pour défendre vos droits en cas de discrimination ou litige avec l'administration.",
    description_en: "Independent authority to defend your rights in cases of discrimination or disputes with administration.",
    description_ko: "차별 또는 행정 분쟁 시 권리를 보호하는 독립 기관.",
    eligibility_rules: { visa_types: ['any'] },
    how_to_apply: {
      steps_fr: ["Saisine en ligne sur defenseurdesdroits.fr", "Ou consulter un délégué local"],
      steps_en: ["File online at defenseurdesdroits.fr", "Or consult a local delegate"],
      steps_ko: ["defenseurdesdroits.fr에서 온라인 접수", "또는 지역 위임자 상담"],
      documents: ["Documents liés au litige"],
    },
    official_url: "https://www.defenseurdesdroits.fr/",
    estimated_amount: "Gratuit",
    processing_time: "2-6 mois",
  },

  // ============================================================
  // EDUCATION (5)
  // ============================================================
  {
    slug: 'cpf-francais',
    category: 'education',
    name_fr: "Cours de Français via CPF",
    name_en: "French Courses via CPF",
    name_ko: "CPF를 통한 프랑스어 강좌",
    description_fr: "Utilisation du CPF pour financer des cours de français langue étrangère (FLE).",
    description_en: "Use CPF credits to fund French as a Foreign Language (FLE) courses.",
    description_ko: "CPF 크레딧을 사용한 외국인 대상 프랑스어(FLE) 강좌.",
    eligibility_rules: { visa_types: ['any'], requires_legal_residency: true, requires_employment: true },
    how_to_apply: {
      steps_fr: ["Rechercher 'FLE' sur moncompteformation.gouv.fr"],
      steps_en: ["Search 'FLE' on moncompteformation.gouv.fr"],
      steps_ko: ["moncompteformation.gouv.fr에서 'FLE' 검색"],
      documents: ["Compte CPF actif"],
    },
    official_url: "https://www.moncompteformation.gouv.fr/",
    estimated_amount: "Via CPF (€500–€5 000)",
    processing_time: "1-2 semaines",
  },
  {
    slug: 'delf-dalf',
    category: 'education',
    name_fr: "DELF / DALF",
    name_en: "DELF / DALF Certification",
    name_ko: "DELF / DALF 인증",
    description_fr: "Diplômes officiels de français langue étrangère, reconnus internationalement. Requis pour certaines démarches.",
    description_en: "Official French language diplomas, internationally recognized. Required for some procedures.",
    description_ko: "국제적으로 인정되는 공식 프랑스어 자격증. 일부 행정 절차에 필요.",
    eligibility_rules: { visa_types: ['any'] },
    how_to_apply: {
      steps_fr: ["S'inscrire dans un centre d'examen agréé", "Passer l'examen"],
      steps_en: ["Register at an approved exam center", "Take the exam"],
      steps_ko: ["공인 시험 센터에 등록", "시험 응시"],
      documents: ["Pièce d'identité"],
    },
    official_url: "https://www.france-education-international.fr/hub/diplomes-tests",
    estimated_amount: "€70–€350 selon niveau",
    processing_time: "Variable (sessions)",
  },
  {
    slug: 'carte-avantages-jeune',
    category: 'education',
    name_fr: "Carte Avantages Jeunes",
    name_en: "Youth Advantage Card",
    name_ko: "청년 혜택 카드",
    description_fr: "Carte de réductions pour les 15-25 ans : transports, culture, sport, loisirs.",
    description_en: "Discount card for ages 15-25: transport, culture, sports, leisure.",
    description_ko: "15-25세 할인 카드: 교통, 문화, 스포츠, 여가.",
    eligibility_rules: { visa_types: ['any'], age_range: { min: 15, max: 25 } },
    how_to_apply: {
      steps_fr: ["Achat en ligne ou en point de vente partenaire"],
      steps_en: ["Purchase online or at partner points of sale"],
      steps_ko: ["온라인 또는 파트너 판매처에서 구매"],
      documents: ["Pièce d'identité"],
    },
    official_url: null,
    estimated_amount: "€8–€15/an",
    processing_time: "Immédiat",
  },
  {
    slug: 'pass-culture',
    category: 'education',
    name_fr: "Pass Culture",
    name_en: "Culture Pass",
    name_ko: "문화 패스 (Pass Culture)",
    description_fr: "Crédit culturel pour les jeunes de 17-18 ans : livres, spectacles, musées, musique. €50 à 17 ans, €150 à 18 ans.",
    description_en: "Cultural credit for ages 17-18: books, shows, museums, music. €50 at 17, €150 at 18.",
    description_ko: "17-18세 청소년을 위한 문화 크레딧: 도서, 공연, 박물관, 음악. 17세 €50, 18세 €150.",
    eligibility_rules: { visa_types: ['any'], requires_legal_residency: true, age_range: { min: 17, max: 18 } },
    how_to_apply: {
      steps_fr: ["Télécharger l'app pass Culture", "S'identifier avec ÉduConnect ou FranceConnect"],
      steps_en: ["Download pass Culture app", "Sign in with ÉduConnect or FranceConnect"],
      steps_ko: ["pass Culture 앱 다운로드", "ÉduConnect 또는 FranceConnect로 로그인"],
      documents: ["Pièce d'identité"],
    },
    official_url: "https://pass.culture.fr/",
    estimated_amount: "€50 (17 ans) / €150 (18 ans)",
    processing_time: "Immédiat",
  },
  {
    slug: 'erasmus-plus',
    category: 'education',
    name_fr: "Erasmus+",
    name_en: "Erasmus+",
    name_ko: "에라스무스+ (Erasmus+)",
    description_fr: "Programme européen de mobilité pour étudiants, enseignants et apprentis.",
    description_en: "European mobility program for students, teachers, and apprentices.",
    description_ko: "학생, 교사, 견습생을 위한 유럽 이동 프로그램.",
    eligibility_rules: { visa_types: ['student'], requires_legal_residency: true },
    how_to_apply: {
      steps_fr: ["Contacter le service des relations internationales de votre établissement"],
      steps_en: ["Contact your institution's international relations office"],
      steps_ko: ["소속 기관 국제 교류처에 문의"],
      documents: ["Certificat de scolarité", "Relevé de notes", "Lettre de motivation"],
    },
    official_url: "https://info.erasmusplus.fr/",
    estimated_amount: "€200–€450/mois (bourse)",
    processing_time: "3-6 mois",
  },
];

async function seed() {
  console.log(`Seeding ${BENEFITS.length} benefits...`);

  // Upsert to handle re-runs
  const { data, error } = await supabase
    .from('benefits')
    .upsert(BENEFITS, { onConflict: 'slug' })
    .select('id');

  if (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }

  console.log(`Seeded ${data.length} benefits successfully.`);

  // Verify counts by category
  const { data: counts } = await supabase
    .from('benefits')
    .select('category')
    .eq('is_active', true);

  if (counts) {
    const byCat: Record<string, number> = {};
    for (const row of counts) {
      byCat[row.category] = (byCat[row.category] || 0) + 1;
    }
    console.log('By category:', byCat);
  }
}

seed();
