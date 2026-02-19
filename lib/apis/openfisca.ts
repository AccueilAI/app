/**
 * OpenFisca API client for French social benefit calculations.
 * Free, open-source microsimulation engine — no authentication required.
 *
 * API docs: https://api.fr.openfisca.org/latest/spec
 */

const API_BASE = 'https://api.fr.openfisca.org/latest';

// ============================================================
// Types
// ============================================================

export interface OpenFiscaSituation {
  individus: Record<string, Record<string, unknown>>;
  familles: Record<string, Record<string, unknown>>;
  menages: Record<string, Record<string, unknown>>;
  foyers_fiscaux: Record<string, Record<string, unknown>>;
}

export interface OpenFiscaVariable {
  id: string;
  description: string;
  definitionPeriod: string;
  valueType: string;
  entity: string;
  formulas: Record<string, unknown>;
  source: string | null;
  references: string[];
}

export interface ExpatSituationParams {
  age: number;
  nationality: string;
  income?: number;
  hasChildren?: boolean;
}

// ============================================================
// API calls
// ============================================================

/**
 * Run a simulation against the OpenFisca engine.
 * Returns the situation with computed values filled in.
 */
export async function calculate(
  situation: OpenFiscaSituation,
): Promise<OpenFiscaSituation | null> {
  try {
    const response = await fetch(`${API_BASE}/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AccueilAI/1.0',
      },
      body: JSON.stringify(situation),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.error(`[openfisca] calculate failed: ${response.status} ${response.statusText} | body=${errorBody.slice(0, 300)}`);
      return null;
    }

    return (await response.json()) as OpenFiscaSituation;
  } catch (error) {
    console.error('[openfisca] calculate error:', error);
    return null;
  }
}

/**
 * Fetch metadata for a specific OpenFisca variable.
 */
export async function getVariable(name: string): Promise<OpenFiscaVariable | null> {
  try {
    const response = await fetch(`${API_BASE}/variable/${encodeURIComponent(name)}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AccueilAI/1.0',
      },
    });

    if (!response.ok) {
      console.error(`[openfisca] getVariable(${name}) failed: ${response.status}`);
      return null;
    }

    return (await response.json()) as OpenFiscaVariable;
  } catch (error) {
    console.error(`[openfisca] getVariable(${name}) error:`, error);
    return null;
  }
}

// ============================================================
// Situation builder
// ============================================================

/**
 * Build an OpenFisca situation JSON from expat profile parameters.
 * Period defaults to the current month (YYYY-MM).
 */
export function buildExpatSituation(params: ExpatSituationParams): OpenFiscaSituation {
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const birthYear = now.getFullYear() - params.age;
  const dateNaissance = `${birthYear}-01-01`;

  // date_naissance is ETERNITY period, nationalite is MONTH period
  const demandeur: Record<string, unknown> = {
    date_naissance: { ETERNITY: dateNaissance },
    nationalite: { [period]: params.nationality },
  };

  if (params.income !== undefined) {
    demandeur.salaire_net = { [period]: params.income };
  }

  // Children are modeled as separate individuals, not a count variable
  const enfants: string[] = [];
  if (params.hasChildren) {
    enfants.push('enfant1');
  }

  return {
    individus: {
      demandeur,
      ...(params.hasChildren
        ? {
            enfant1: {
              date_naissance: { ETERNITY: `${now.getFullYear() - 5}-01-01` },
            },
          }
        : {}),
    },
    familles: {
      famille1: {
        parents: ['demandeur'],
        enfants,
      },
    },
    menages: {
      menage1: {
        personne_de_reference: ['demandeur'],
        enfants,
      },
    },
    foyers_fiscaux: {
      foyer1: {
        declarants: ['demandeur'],
        personnes_a_charge: enfants,
      },
    },
  };
}
