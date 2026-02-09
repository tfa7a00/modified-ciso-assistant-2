<script lang="ts">
	// Page simple pour afficher une "méthode personnalisée"
	// avec des tableaux statiques basés sur tes définitions en français.

	type Row = Record<string, string>;

	// Gestion des 7 sous-parties de la méthode personnalisée (ajout de controle-document)
	type SectionId =
		| 'controle-document'
		| 'registre-classification'
		| 'aide-classification'
		| 'cartographie-risques'
		| 'aide-risque'
		| 'ptr'
		| 'echelle-ptr';

	let activeSection: SectionId = 'controle-document';

	// Vue pour la cartographie: identification / risque brut / risque net / PTR+résiduel
	let cartoView: 'all' | 'identification' | 'brut' | 'net' | 'ptr' = 'identification';

	// --- Données pour Contrôle du document ---
	type RedactionRow = {
		role: string;
		nom: string;
		fonction: string;
		date: string;
	};

	let redactionRows: RedactionRow[] = [
		{ role: 'Écrit par :', nom: 'Consultants SSI', fonction: 'NEARSECURE', date: '' },
		{ role: 'Relu par :', nom: '', fonction: '', date: '' },
		{ role: 'Approuvé par :', nom: '', fonction: '', date: '' }
	];

	type DiffusionRow = {
		nom: string;
		entite_fonction: string;
		date: string;
	};

	let diffusionRows: DiffusionRow[] = [
		{ nom: '', entite_fonction: '', date: '' },
		{ nom: '', entite_fonction: '', date: '' },
		{ nom: '', entite_fonction: '', date: '' },
		{ nom: '', entite_fonction: '', date: '' }
	];

	type VersionRow = {
		version: string;
		date: string;
		modification: string;
	};

	let versionRows: VersionRow[] = [
		{ version: '', date: '', modification: '' },
		{ version: '', date: '', modification: '' },
		{ version: '', date: '', modification: '' },
		{ version: '', date: '', modification: '' }
	];

	// --- Données pour Registre de classification ---
	type RegistreRow = {
		id: string;
		id_ps: string;
		processus_metier: string;
		activite_sous_processus: string;
		designation_actif: string;
		description_actif: string;
		categorie_actif: string;
		type_actif: string;
		proprietaire_actif: string;
		disponibilite: string;
		integrite: string;
		confidentialite: string;
		sensibilite: string;
		commentaire: string;
	};

	let registreRows: RegistreRow[] = [
		{
			id: '',
			id_ps: '',
			processus_metier: '',
			activite_sous_processus: '',
			designation_actif: '',
			description_actif: '',
			categorie_actif: '',
			type_actif: '',
			proprietaire_actif: '',
			disponibilite: '',
			integrite: '',
			confidentialite: '',
			sensibilite: '',
			commentaire: ''
		}
	];


	let periodiciteRows: Row[] = [
		{ periodicite: 'QuickWin', duree: '0 – 3 mois' },
		{ periodicite: 'Court terme', duree: '3 – 12 mois' },
		{ periodicite: 'Moyen terme', duree: '12 – 18 mois' },
		{ periodicite: 'Long terme', duree: 'Supérieur à 18 mois' },
		{ periodicite: 'Périodique', duree: 'Périodiquement' }
	];

	let complexiteRows: Row[] = [
		{
			complexite: 'Important',
			definition:
				"Complexité à coût important, correspondant à une tâche supérieure à une dizaine de jours/homme et/ou un coût supérieur à une centaine de milliers de dirhams (par exemple, refonte d'une architecture réseau)."
		},
		{
			complexite: 'Moyen',
			definition:
				"Complexité à coût moyen, correspondant à une tâche inférieure à une dizaine de jours/homme et/ou un coût inférieur à une centaine de milliers de dirhams (par exemple, rédaction d'une procédure plus complexe, achat d'un composant, etc.)."
		},
		{
			complexite: 'Faible',
			definition:
				"Complexité à coût faible, n'entraînant pas de coût d'acquisition (par exemple, modification d'un paramètre, rédaction d'une procédure simple, etc.)."
		}
	];

	let typeActionRows: Row[] = [
		{
			type_action: 'Action Organisationnelle',
			description: 'Action visant à modifier les processus ou politiques internes de la SOCIÉTÉ.'
		},
		{
			type_action: 'Action Technique',
			description: 'Intervention sur les SI ou infrastructures techniques de la SOCIÉTÉ.'
		},
		{
			type_action: 'Action Organisationnelle et Technique',
			description: 'Action combinant les deux dimensions (organisationnelle et technique).'
		}
	];

	let prioriteRows: Row[] = [
		{
			echelle: 'Priorité 4',
			definition: 'Risque Faible',
			signification: '[1 – 20['
		},
		{
			echelle: 'Priorité 3',
			definition: 'Risque Modéré',
			signification: '[20 – 36['
		},
		{
			echelle: 'Priorité 2',
			definition: 'Risque Élevé',
			signification: '[36 – 64['
		},
		{
			echelle: 'Priorité 1',
			definition: 'Risque Extrême',
			signification: '[64 – 120]'
		}
	];

	// --- Aide-Classification: Tableaux DIC ---

	type DICCriteriaRow = {
		critere: string;
		definition: string;
		bgColor: string;
	};

	let dicCriteriaRows: DICCriteriaRow[] = [
		{
			critere: 'Disponibilité',
			definition:
				"Les utilisateurs autorisés ont accès à l'information et aux actifs correspondants quand ils en ont besoin.",
			bgColor: 'bg-green-600'
		},
		{
			critere: 'Intégrité',
			definition: "Garantir l'exactitude, la précision et l'intégralité de l'information.",
			bgColor: 'bg-green-400'
		},
		{
			critere: 'Confidentialité',
			definition: "L'information n'est accessible qu'aux personnes autorisées.",
			bgColor: 'bg-blue-600'
		}
	];

	type DICNiveauRow = {
		valeur: string;
		disponibilite: string;
		integrite: string;
		confidentialite: string;
	};

	let dicNiveauxRows: DICNiveauRow[] = [
		{
			valeur: 'Faible',
			disponibilite:
				"Tolérance à l'indisponibilité <span class='font-bold text-green-700'>entre 48h et une semaine</span>. Si ce besoin n'est pas respecté, l'organisation court un **impact mineur** sur les activités.",
			integrite:
				"<span class='font-bold text-green-700'>La perte d'intégrité momentanée</span> des informations est acceptée, sous réserve qu'elle soit signalée et ne remette pas en cause le service fourni.",
			confidentialite:
				"<span class='font-bold text-green-700'>Public</span> : Information qui peut être rendue publique sans implication pour l'entité ou pour l'organisation."
		},
		{
			valeur: 'Moyen',
			disponibilite:
				"Tolérance à l'indisponibilité <span class='font-bold text-orange-700'>entre 24h et 48h</span>. Si ce besoin n'est pas respecté, l'organisation court un **impact modéré**.",
			integrite:
				"<span class='font-bold text-orange-700'>La perte d'intégrité tolérée si signalée</span> dans un délai suffisant pour ne pas avoir de conséquence grave sur le service fourni.",
			confidentialite:
				"<span class='font-bold text-orange-700'>Interne</span> : Information ayant vocation à demeurer au sein de l'organisation. Sa communication à l'extérieur de l'organisation ne peut se faire que sur autorisation."
		},
		{
			valeur: 'Élevé',
			disponibilite:
				"Tolérance à l'indisponibilité <span class='font-bold text-red-700'>entre 4h et 24h</span>. Si ce besoin n'est pas respecté, l'organisation court un **impact significatif**.",
			integrite:
				"Les informations <span class='font-bold text-red-700'>doivent rester intègres pendant la période d'utilisation</span> ; toute perte en dehors de cette période doit être signalée et justifiée.",
			confidentialite:
				"<span class='font-bold text-red-700'>Restreint</span> : Information qui aurait un impact dommageable sur l'organisation si elle était communiquée à des personnes non habilitées. Elle nécessite un accès limité à des personnes ou à un groupe d'utilisateurs bien défini."
		},
		{
			valeur: 'Très élevé',
			disponibilite:
				"Tolérance à l'indisponibilité <span class='font-bold text-rose-900'>inférieure à 4 heures</span>. Si ce besoin n'est pas respecté, l'organisation court un **impact exceptionnellement majeur**.",
			integrite:
				"Les informations sont <span class='font-bold text-rose-900'>certifiées intègres</span> pendant toute leur période de validité.",
			confidentialite:
				"<span class='font-bold text-rose-900'>Confidentiel</span> : La divulgation de l'information aurait un impact majeur sur la SOCIETE si elle était communiquée à des personnes nommément désignées pour en connaître. Le circuit de l'information obéit à des règles très strictes."
		}
	];

	let categoriesActifsRows: string[] = [
		'Matériel informatique',
		'Application',
		'Equipements sécurité',
		'Equipements réseaux',
		'Ressources humaines',
		'Document',
		'Données',
		'Site'
	];

	function getPeriodiciteBg(periodicite: string): string {
		switch (periodicite) {
			case 'QuickWin':
				return 'bg-orange-100';
			case 'Court terme':
				return 'bg-green-100';
			case 'Moyen terme':
				return 'bg-yellow-100';
			case 'Long terme':
				return 'bg-gray-100';
			case 'Périodique':
				return 'bg-sky-100';
			default:
				return 'bg-white';
		}
	}

	function getComplexiteBg(complexite: string): string {
		switch (complexite) {
			case 'Important':
				return 'bg-red-500 text-black';
			case 'Moyen':
				return 'bg-yellow-400 text-black';
			case 'Faible':
				return 'bg-green-400 text-black';
			default:
				return 'bg-white text-black';
		}
	}

	function getTypeActionBg(typeAction: string): string {
		switch (typeAction) {
			case 'Action Organisationnelle':
				return 'bg-sky-100';
			case 'Action Technique':
				return 'bg-green-100';
			case 'Action Organisationnelle et Technique':
				return 'bg-amber-100';
			default:
				return 'bg-white';
		}
	}

	function getPrioriteDefinitionBg(echelle: string): string {
		switch (echelle) {
			case 'Priorité 4':
				return 'bg-green-400 text-black';
			case 'Priorité 3':
				return 'bg-yellow-300 text-black';
			case 'Priorité 2':
				return 'bg-orange-400 text-black';
			case 'Priorité 1':
				return 'bg-red-500 text-black';
			default:
				return 'bg-white text-black';
		}
	}

	function getValeurBg(valeur: string): string {
		switch (valeur) {
			case 'Faible':
				return 'bg-green-500';
			case 'Moyen':
				return 'bg-orange-500';
			case 'Élevé':
				return 'bg-red-500';
			case 'Très élevé':
				return 'bg-rose-900';
			default:
				return 'bg-orange-500';
		}
	}

	// --- Aide-Risque : tableaux probabilité / impact / fréquence / matrice ---

	type ProbaRow = {
		echelle: string;
		definition: string;
		frequence: string;
		historique: string;
	};

	let probaRows: ProbaRow[] = [
		{
			echelle: '1',
			definition: 'Très faible',
			frequence: 'Pas de chance que le scénario se réalise avec succès.',
			historique: 'Une fois tous les 10 ans.'
		},
		{
			echelle: '2',
			definition: 'Faible',
			frequence: 'Très peu de chance que le scénario se réalise avec succès.',
			historique: 'Une fois tous les 3 ans.'
		},
		{
			echelle: '3',
			definition: 'Moyen',
			frequence: 'Peu de chance que le scénario se réalise avec succès.',
			historique: 'Une à plusieurs fois par an.'
		},
		{
			echelle: '4',
			definition: 'Forte',
			frequence: 'Fortes chances que le scénario se réalise avec succès à moyen terme.',
			historique: 'Une à plusieurs fois par mois.'
		},
		{
			echelle: '5',
			definition: 'Très forte',
			frequence: 'Le scénario se réalise fréquemment avec succès à court terme.',
			historique: 'Une à plusieurs fois par semaine.'
		}
	];

	type ImpactRow = {
		echelle: string;
		definition: string;
		financier: string;
		reputation: string;
		parties_prenantes: string;
		reglementaire: string;
	};

	let impactRows: ImpactRow[] = [
		{
			echelle: '1',
			definition: 'Très faible',
			financier: 'Inférieur à 2 KDH.',
			reputation: 'Aucun impact.',
			parties_prenantes: 'Aucun impact.',
			reglementaire: 'Aucun impact.'
		},
		{
			echelle: '2',
			definition: 'Faible',
			financier: 'Entre 2 et 20 KDH.',
			reputation: 'Impact visible mais médiatisation limitée.',
			parties_prenantes: 'Impact limité.',
			reglementaire: 'Non‑conformité mineure, sanctions < 20 KDH.'
		},
		{
			echelle: '3',
			definition: 'Moyen',
			financier: 'Entre 20 et 200 KDH.',
			reputation: 'Couverture médiatique modérée.',
			parties_prenantes: 'Impact modéré / réclamations récurrentes.',
			reglementaire: 'Non‑conformité modérée, sanctions 20–200 KDH.'
		},
		{
			echelle: '4',
			definition: 'Fort',
			financier: 'Entre 200 K et 2 MDH.',
			reputation: 'Large couverture médiatique.',
			parties_prenantes: 'Impact significatif / réclamations graves et nombreuses.',
			reglementaire: 'Non‑conformité majeure, sanctions 200 K–2 MDH.'
		},
		{
			echelle: '5',
			definition: 'Très fort',
			financier: 'Entre 2 MDH et 20 MDH.',
			reputation: 'Couverture négative prolongée.',
			parties_prenantes: 'Perte de confiance.',
			reglementaire: 'Non‑conformité catastrophique, sanctions > 2 MDH.'
		},
		{
			echelle: '6',
			definition: 'Critique',
			financier: 'Supérieur à 20 MDH.',
			reputation: "Impact très important et durable sur l'image.",
			parties_prenantes: 'Conséquences potentiellement catastrophiques pour les parties prenantes.',
			reglementaire:
				"Non‑conformité critique, sanctions majeures et risque sur la continuité de l'organisation."
		}
	];

	let frequenceRisqueRows: Row[] = [
		{ echelle: '1', definition: 'Risque Faible', signification: '[1 – 20[' },
		{ echelle: '2', definition: 'Risque Modéré', signification: '[20 – 36[' },
		{ echelle: '3', definition: 'Risque Elevé', signification: '[36 – 64[' },
		{ echelle: '4', definition: 'Risque Extrême', signification: '[64 – 120]' }
	];

	type MatriceRow = { libelle: string; valeurs: number[] };

	let matriceRisqueRows: MatriceRow[] = [
		{ libelle: '4×1', valeurs: [4, 8, 12, 16, 20] },
		{ libelle: '4×2', valeurs: [8, 16, 24, 32, 40] },
		{ libelle: '4×3', valeurs: [12, 24, 36, 48, 60] },
		{ libelle: '4×4', valeurs: [16, 32, 48, 64, 80] },
		{ libelle: '4×5', valeurs: [20, 40, 60, 80, 100] },
		{ libelle: '4×6', valeurs: [24, 48, 72, 96, 120] }
	];

	function getProbaDefBg(definition: string): string {
		switch (definition) {
			case 'Très faible':
				return 'bg-green-400 text-black';
			case 'Faible':
				return 'bg-yellow-300 text-black';
			case 'Moyen':
				return 'bg-orange-400 text-black';
			case 'Forte':
				return 'bg-red-500 text-black';
			case 'Très forte':
				return 'bg-red-700 text-black';
			default:
				return 'bg-white text-black';
		}
	}

	function getImpactDefBg(definition: string): string {
		switch (definition) {
			case 'Très faible':
				return 'bg-green-400 text-black';
			case 'Faible':
				return 'bg-yellow-300 text-black';
			case 'Moyen':
				return 'bg-orange-400 text-black';
			case 'Fort':
				return 'bg-red-500 text-black';
			case 'Très fort':
				return 'bg-red-700 text-black';
			case 'Critique':
				return 'bg-red-900 text-white';
			default:
				return 'bg-white text-black';
		}
	}

	function getFrequenceDefBg(definition: string): string {
		switch (definition) {
			case 'Risque Faible':
				return 'bg-green-400 text-black';
			case 'Risque Modéré':
				return 'bg-yellow-300 text-black';
			case 'Risque Elevé':
				return 'bg-orange-400 text-black';
			case 'Risque Extrême':
				return 'bg-red-500 text-black';
			default:
				return 'bg-white text-black';
		}
	}

	function getMatriceCellBg(valeur: number): string {
		if (valeur < 20) {
			return 'bg-green-400 text-black';
		}
		if (valeur >= 20 && valeur < 36) {
			return 'bg-yellow-300 text-black';
		}
		if (valeur >= 36 && valeur < 64) {
			return 'bg-orange-400 text-black';
		}
		return 'bg-red-500 text-black';
	}

	// Fonctions pour ajouter/supprimer des lignes
	// Fonctions génériques pour ajouter/supprimer des lignes à n'importe quelle position
	function insererLigneAvant(array: any[], index: number, nouvelleValeur: any) {
		const result = [...array];
		result.splice(index, 0, nouvelleValeur);
		return result;
	}

	function insererLigneApres(array: any[], index: number, nouvelleValeur: any) {
		const result = [...array];
		result.splice(index + 1, 0, nouvelleValeur);
		return result;
	}

	function supprimerLigneAt(array: any[], index: number) {
		return array.filter((_, i) => i !== index);
	}

	function ajouterLigneDiffusion() {
		diffusionRows = [...diffusionRows, { nom: '', entite_fonction: '', date: '' }];
	}

	function supprimerLigneDiffusion(index: number) {
		diffusionRows = diffusionRows.filter((_, i) => i !== index);
	}

	function insererLigneDiffusionAvant(index: number) {
		diffusionRows = insererLigneAvant(diffusionRows, index, { nom: '', entite_fonction: '', date: '' });
	}

	function insererLigneDiffusionApres(index: number) {
		diffusionRows = insererLigneApres(diffusionRows, index, { nom: '', entite_fonction: '', date: '' });
	}

	function ajouterLigneVersion() {
		versionRows = [...versionRows, { version: '', date: '', modification: '' }];
	}

	function supprimerLigneVersion(index: number) {
		versionRows = versionRows.filter((_, i) => i !== index);
	}

	function insererLigneVersionAvant(index: number) {
		versionRows = insererLigneAvant(versionRows, index, { version: '', date: '', modification: '' });
	}

	function insererLigneVersionApres(index: number) {
		versionRows = insererLigneApres(versionRows, index, { version: '', date: '', modification: '' });
	}

	// Fonctions pour tableau Rédaction (Contrôle du document)
	function ajouterLigneRedaction() {
		redactionRows = [...redactionRows, { role: '', nom: '', fonction: '', date: '' }];
	}

	function supprimerLigneRedaction(index: number) {
		redactionRows = redactionRows.filter((_, i) => i !== index);
	}

	function insererLigneRedactionAvant(index: number) {
		redactionRows = insererLigneAvant(redactionRows, index, { role: '', nom: '', fonction: '', date: '' });
	}

	function insererLigneRedactionApres(index: number) {
		redactionRows = insererLigneApres(redactionRows, index, { role: '', nom: '', fonction: '', date: '' });
	}

	function ajouterCategorieActif() {
		categoriesActifsRows = [...categoriesActifsRows, ''];
	}

	function supprimerCategorieActif(index: number) {
		categoriesActifsRows = categoriesActifsRows.filter((_, i) => i !== index);
	}

	function insererCategorieActifAvant(index: number) {
		categoriesActifsRows = insererLigneAvant(categoriesActifsRows, index, '');
	}

	function insererCategorieActifApres(index: number) {
		categoriesActifsRows = insererLigneApres(categoriesActifsRows, index, '');
	}

	// Fonctions pour tableaux Aide-Risque (Probabilité, Impact)
	function insererProbaAvant(index: number) {
		const defaultProba: ProbaRow = { echelle: '', definition: '', frequence: '', historique: '' };
		probaRows = insererLigneAvant(probaRows, index, defaultProba);
	}

	function insererProbaApres(index: number) {
		const defaultProba: ProbaRow = { echelle: '', definition: '', frequence: '', historique: '' };
		probaRows = insererLigneApres(probaRows, index, defaultProba);
	}

	function ajouterProba() {
		const defaultProba: ProbaRow = { echelle: '', definition: '', frequence: '', historique: '' };
		probaRows = [...probaRows, defaultProba];
	}

	function supprimerProba(index: number) {
		probaRows = supprimerLigneAt(probaRows, index);
	}

	function insererImpactAvant(index: number) {
		const defaultImpact: ImpactRow = { echelle: '', definition: '', financier: '', reputation: '', parties_prenantes: '', reglementaire: '' };
		impactRows = insererLigneAvant(impactRows, index, defaultImpact);
	}

	function insererImpactApres(index: number) {
		const defaultImpact: ImpactRow = { echelle: '', definition: '', financier: '', reputation: '', parties_prenantes: '', reglementaire: '' };
		impactRows = insererLigneApres(impactRows, index, defaultImpact);
	}

	function ajouterImpact() {
		const defaultImpact: ImpactRow = { echelle: '', definition: '', financier: '', reputation: '', parties_prenantes: '', reglementaire: '' };
		impactRows = [...impactRows, defaultImpact];
	}

	// Fonctions pour Échelle-PTR (Periodicité / Complexité / TypeAction / Priorité)

	function ajouterPeriodicite() {
		periodiciteRows = [...periodiciteRows, { periodicite: '', duree: '' }];
	}

	function supprimerPeriodicite(index: number) {
		periodiciteRows = periodiciteRows.filter((_, i) => i !== index);
	}

	function insererPeriodiciteAvant(index: number) {
		periodiciteRows = insererLigneAvant(periodiciteRows, index, { periodicite: '', duree: '' });
	}

	function insererPeriodiciteApres(index: number) {
		periodiciteRows = insererLigneApres(periodiciteRows, index, { periodicite: '', duree: '' });
	}

	function ajouterComplexite() {
		complexiteRows = [...complexiteRows, { complexite: '', definition: '' }];
	}

	function supprimerComplexite(index: number) {
		complexiteRows = complexiteRows.filter((_, i) => i !== index);
	}

	function insererComplexiteAvant(index: number) {
		complexiteRows = insererLigneAvant(complexiteRows, index, { complexite: '', definition: '' });
	}

	function insererComplexiteApres(index: number) {
		complexiteRows = insererLigneApres(complexiteRows, index, { complexite: '', definition: '' });
	}

	function ajouterTypeAction() {
		typeActionRows = [...typeActionRows, { type_action: '', description: '' }];
	}

	function supprimerTypeAction(index: number) {
		typeActionRows = typeActionRows.filter((_, i) => i !== index);
	}

	function insererTypeActionAvant(index: number) {
		typeActionRows = insererLigneAvant(typeActionRows, index, { type_action: '', description: '' });
	}

	function insererTypeActionApres(index: number) {
		typeActionRows = insererLigneApres(typeActionRows, index, { type_action: '', description: '' });
	}

	function ajouterPriorite() {
		prioriteRows = [...prioriteRows, { echelle: '', definition: '', signification: '' }];
	}

	function supprimerPriorite(index: number) {
		prioriteRows = prioriteRows.filter((_, i) => i !== index);
	}

	function insererPrioriteAvant(index: number) {
		prioriteRows = insererLigneAvant(prioriteRows, index, { echelle: '', definition: '', signification: '' });
	}

	function insererPrioriteApres(index: number) {
		prioriteRows = insererLigneApres(prioriteRows, index, { echelle: '', definition: '', signification: '' });
	}

	function supprimerImpact(index: number) {
		impactRows = supprimerLigneAt(impactRows, index);
	}

	// Fonctions pour PTR (addRow/deleteRow existantes, mais ajouter les variantes)
	function insererPtrAvant(index: number) {
		const newRow = {
			id: ptrData.length + 1,
			refRisque: '',
			correspISO: '',
			proprietaire: '',
			niveauRisque: '',
			decision: '',
			idPTR: '',
			action: '',
			typeAction: '',
			porteur: '',
			priorite: '',
			periodicite: '',
			complexite: '',
			echeance: '',
			etatAvancement: ''
		};
		ptrData = insererLigneAvant(ptrData, index, newRow);
		ptrData = ptrData.map((row, i) => ({ ...row, id: i + 1 }));
	}

	function insererPtrApres(index: number) {
		const newRow = {
			id: ptrData.length + 1,
			refRisque: '',
			correspISO: '',
			proprietaire: '',
			niveauRisque: '',
			decision: '',
			idPTR: '',
			action: '',
			typeAction: '',
			porteur: '',
			priorite: '',
			periodicite: '',
			complexite: '',
			echeance: '',
			etatAvancement: ''
		};
		ptrData = insererLigneApres(ptrData, index, newRow);
		ptrData = ptrData.map((row, i) => ({ ...row, id: i + 1 }));
	}

	// Fonctions pour le registre de classification
	function ajouterLigneRegistre() {
		registreRows = [
			...registreRows,
			{
				id: '',
				id_ps: '',
				processus_metier: '',
				activite_sous_processus: '',
				designation_actif: '',
				description_actif: '',
				categorie_actif: '',
				type_actif: '',
				proprietaire_actif: '',
				disponibilite: '',
				integrite: '',
				confidentialite: '',
				sensibilite: '',
				commentaire: ''
			}
		];
	}

	function supprimerLigneRegistre(index: number) {
		registreRows = registreRows.filter((_, i) => i !== index);
	}

	function getNiveauBesoinBg(niveau: string): string {
		switch (niveau) {
			case 'Faible':
				return 'bg-green-500 text-white';
			case 'Moyen':
				return 'bg-yellow-400 text-black';
			case 'Élevé':
				return 'bg-orange-500 text-white';
			case 'Très élevé':
				return 'bg-red-600 text-white';
			default:
				return 'bg-white text-black';
		}
	}

	function calculerSensibilite(index: number) {
		const row = registreRows[index];
		const niveaux = [row.disponibilite, row.integrite, row.confidentialite];
		
		// Convertir les niveaux en valeurs numériques
		const valeurs = niveaux.map((n) => {
			switch (n) {
				case 'Faible':
					return 1;
				case 'Moyen':
					return 2;
				case 'Élevé':
					return 3;
				case 'Très élevé':
					return 4;
				default:
					return 0;
			}
		});

		// Filtrer les valeurs non nulles
		const valeursValides = valeurs.filter((v) => v > 0);
		
		if (valeursValides.length === 0) {
			registreRows[index].sensibilite = '';
			return;
		}

		// Calculer la moyenne
		const moyenne = valeursValides.reduce((acc, val) => acc + val, 0) / valeursValides.length;

		// Convertir la moyenne en niveau
		if (moyenne <= 1.5) {
			registreRows[index].sensibilite = 'Faible';
		} else if (moyenne <= 2.5) {
			registreRows[index].sensibilite = 'Moyen';
		} else if (moyenne <= 3.5) {
			registreRows[index].sensibilite = 'Élevé';
		} else {
			registreRows[index].sensibilite = 'Très élevé';
		}
	}



	// PTR Table data structure
	let ptrData = [
		{
			id: 1,
			refRisque: '',
			correspISO: '',
			proprietaire: '',
			niveauRisque: '',
			decision: '',
			idPTR: '',
			action: '',
			typeAction: '',
			porteur: '',
			priorite: '',
			periodicite: '',
			complexite: '',
			echeance: '',
			etatAvancement: ''
		}
	];

	// Function to add a new row
	function addRow() {
		const newRow = {
			id: ptrData.length + 1,
			refRisque: '',
			correspISO: '',
			proprietaire: '',
			niveauRisque: '',
			decision: '',
			idPTR: '',
			action: '',
			typeAction: '',
			porteur: '',
			priorite: '',
			periodicite: '',
			complexite: '',
			echeance: '',
			etatAvancement: ''
		};
		ptrData = [...ptrData, newRow];
	}

	// Function to delete a row
	function deleteRow(index) {
		ptrData = ptrData.filter((_, i) => i !== index);
		// Reindex the IDs
		ptrData = ptrData.map((row, i) => ({ ...row, id: i + 1 }));
	}

	// Handle cell value changes
	function updateCell(index, field, event) {
		ptrData[index][field] = event.target.value;
	}

</script>

<style>
    /* Hide/show table cells (only tbody td/data cells, NOT headers).
       Keep all <thead> cells visible so headers display correctly for each view.
       Columns 4-5 (Description, Code Risque) always stay visible in ALL views.
       Views: identification (1-20), brut (21-32), net (33-38), ptr (39-45).
    */

    /* Identification view: hide data columns 21 and beyond */
    .view-identification tbody tr td:nth-child(n+21) {
        display: none;
    }

    /* Risque Brut view: show cols 4-5 (Description, Code Risque) + 21-32 (brut), hide 1-3 and 6-20 and 33+ */
    .view-brut tbody tr td:nth-child(n+1):nth-child(-n+3),
    .view-brut tbody tr td:nth-child(n+6):nth-child(-n+20),
    .view-brut tbody tr td:nth-child(n+33) {
        display: none;
    }

    /* Degré + Risque Net view: show cols 4-5 (Description, Code Risque) + 33-38 (net), hide 1-3 and 6-32 and 39+ */
    .view-net tbody tr td:nth-child(n+1):nth-child(-n+3),
    .view-net tbody tr td:nth-child(n+6):nth-child(-n+32),
    .view-net tbody tr td:nth-child(n+39) {
        display: none;
    }

    /* PTR + Résiduel view: show cols 4-5 (Description, Code Risque) + 39-45 (ptr), hide 1-3 and 6-38 */
    .view-ptr tbody tr td:nth-child(n+1):nth-child(-n+3),
    .view-ptr tbody tr td:nth-child(n+6):nth-child(-n+38) {
        display: none;
    }

    /* Keep table layout predictable */
    table {
        table-layout: auto;
    }
</style>

<main class="p-6 space-y-8">
	<section class="space-y-2">
		<h1 class="text-2xl font-bold text-gray-900">Méthode personnalisée</h1>
		<p class="text-gray-600 max-w-3xl">
			Cette page regroupe les éléments de ta méthode personnalisée (contrôle du document, registre de classification,
			aides, cartographie des risques, PTR et échelle PTR). Les sections ci-dessous ne modifient
			pas le moteur de scoring standard de CISO Assistant, mais servent de guide pour la méthode de
			NearSecure.
		</p>
	</section>

	<!-- Navigation entre les 7 sous-parties -->
	<nav class="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
		<button
			type="button"
			class={`px-3 py-1.5 text-sm rounded-md border ${
				activeSection === 'controle-document'
					? 'bg-sky-600 text-white border-sky-600'
					: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
			}`}
			on:click={() => (activeSection = 'controle-document')}
		>
			Contrôle du document
		</button>
		<button
			type="button"
			class={`px-3 py-1.5 text-sm rounded-md border ${
				activeSection === 'registre-classification'
					? 'bg-sky-600 text-white border-sky-600'
					: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
			}`}
			on:click={() => (activeSection = 'registre-classification')}
		>
			Registre de classification
		</button>
		<button
			type="button"
			class={`px-3 py-1.5 text-sm rounded-md border ${
				activeSection === 'aide-classification'
					? 'bg-sky-600 text-white border-sky-600'
					: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
			}`}
			on:click={() => (activeSection = 'aide-classification')}
		>
			Aide-Classification
		</button>
		<button
			type="button"
			class={`px-3 py-1.5 text-sm rounded-md border ${
				activeSection === 'cartographie-risques'
					? 'bg-sky-600 text-white border-sky-600'
					: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
			}`}
			on:click={() => (activeSection = 'cartographie-risques')}
		>
			Cartographie des risques
		</button>
		<button
			type="button"
			class={`px-3 py-1.5 text-sm rounded-md border ${
				activeSection === 'aide-risque'
					? 'bg-sky-600 text-white border-sky-600'
					: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
			}`}
			on:click={() => (activeSection = 'aide-risque')}
		>
			Aide-Risque
		</button>
		<button
			type="button"
			class={`px-3 py-1.5 text-sm rounded-md border ${
				activeSection === 'ptr'
					? 'bg-sky-600 text-white border-sky-600'
					: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
			}`}
			on:click={() => (activeSection = 'ptr')}
		>
			PTR
		</button>
		<button
			type="button"
			class={`px-3 py-1.5 text-sm rounded-md border ${
				activeSection === 'echelle-ptr'
					? 'bg-sky-600 text-white border-sky-600'
					: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
			}`}
			on:click={() => (activeSection = 'echelle-ptr')}
		>
			Échelle-PTR (Tables 1 à 4)
		</button>
	</nav>

	<!-- Contenu : 7 sous-parties -->

	{#if activeSection === 'controle-document'}
		<section class="space-y-8">
			<h2 class="text-xl font-semibold text-gray-900">Contrôle du document</h2>
			
			<div class="space-y-2">
				<div class="p-4 bg-blue-50 border-l-4 border-blue-600">
					<p class="font-bold text-gray-900">REGISTRE DE CLASSIFICATION DES ACTIFS INFORMATIONNELS</p>
					<p class="font-bold text-gray-900">CARTOGRAPHIE D'ANALYSE DES RISQUES DE SÉCURITÉ SI</p>
				</div>
			</div>

			<!-- Tableau 1: Rédaction du document -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">1. Rédaction du document</h3>
				<div class="overflow-hidden rounded-lg border border-gray-700 bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-gray-700">
						<thead>
							<tr>
								<th colspan="4" class="px-4 py-3 text-left font-semibold text-white bg-slate-900 border border-gray-700">
									RÉDACTION DU DOCUMENT
								</th>
							</tr>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-gray-600 border border-gray-700 w-32">
									Rôle
								</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-gray-600 border border-gray-700">
									Nom
								</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-gray-600 border border-gray-700">
									Fonction
								</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-gray-600 border border-gray-700">
									Date
								</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-gray-600 border border-gray-700">
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{#each redactionRows as row, i}
								<tr class="border border-gray-700">
									<td class="px-4 py-2 font-semibold text-white bg-gray-600 border border-gray-700">
										{row.role}
									</td>
									<td class="px-4 py-2 text-black border border-gray-700 bg-white">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
											type="text"
											bind:value={redactionRows[i].nom}
										/>
									</td>
									<td class="px-4 py-2 text-black border border-gray-700 bg-white">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
											type="text"
											bind:value={redactionRows[i].fonction}
										/>
									</td>
									<td class="px-4 py-2 text-black border border-gray-700 bg-white">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
											type="text"
											bind:value={redactionRows[i].date}
										/>
									</td>
									<td class="px-4 py-2 border border-gray-700 bg-gray-100">
										<div class="flex gap-1">
											<button
												type="button"
												class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
												on:click={() => insererLigneRedactionAvant(i)}
												title="Ajouter avant"
											>
												↑+
											</button>
											<button
												type="button"
												class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
												on:click={() => insererLigneRedactionApres(i)}
												title="Ajouter après"
											>
												↓+
											</button>
											<button
												type="button"
												class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
												on:click={() => supprimerLigneRedaction(i)}
												title="Supprimer"
											>
												✕
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
					</div>
					<div class="flex gap-2 mt-2">
						<button
							type="button"
							class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
							on:click={ajouterLigneRedaction}
						>
							+ Ajouter une ligne
						</button>
						{#if redactionRows.length > 1}
							<button
								type="button"
								class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
								on:click={() => supprimerLigneRedaction(redactionRows.length - 1)}
							>
								- Supprimer la dernière ligne
							</button>
						{/if}
					</div>

			</section>

			<!-- Tableau 2: Diffusion du document -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">2. Diffusion du document</h3>
				<div class="overflow-hidden rounded-lg border border-gray-700 bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-gray-700">
						<thead>
							<tr>
								<th colspan="3" class="px-4 py-3 text-left font-semibold text-white bg-slate-900 border border-gray-700">
									DIFFUSION DU DOCUMENT
								</th>
							</tr>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-gray-600 border border-gray-700">
									Nom
								</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-gray-600 border border-gray-700">
									Entité / Fonction
								</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-gray-600 border border-gray-700">
									Date
								</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-gray-600 border border-gray-700">
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{#each diffusionRows as row, i}
								<tr class="border border-gray-700">
									<td class="px-4 py-2 text-black border border-gray-700 bg-white">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
											type="text"
											bind:value={diffusionRows[i].nom}
										/>
									</td>
									<td class="px-4 py-2 text-black border border-gray-700 bg-white">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
											type="text"
											bind:value={diffusionRows[i].entite_fonction}
										/>
									</td>
									<td class="px-4 py-2 text-black border border-gray-700 bg-white">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
											type="text"
											bind:value={diffusionRows[i].date}
										/>
									</td>
									<td class="px-4 py-2 border border-gray-700 bg-gray-100">
										<div class="flex gap-1">
											<button
												type="button"
												class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
												on:click={() => insererLigneDiffusionAvant(i)}
												title="Ajouter avant"
											>
												↑+
											</button>
											<button
												type="button"
												class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
												on:click={() => insererLigneDiffusionApres(i)}
												title="Ajouter après"
											>
												↓+
											</button>
											<button
												type="button"
												class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
												on:click={() => supprimerLigneDiffusion(i)}
												title="Supprimer"
											>
												✕
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<div class="flex gap-2">
					<button
						type="button"
						class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
						on:click={ajouterLigneDiffusion}
					>
						+ Ajouter une ligne
					</button>
					{#if diffusionRows.length > 1}
						<button
							type="button"
							class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
							on:click={() => supprimerLigneDiffusion(diffusionRows.length - 1)}
						>
							- Supprimer la dernière ligne
						</button>
					{/if}
				</div>
			</section>

			<!-- Tableau 3: Contrôle des versions -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">3. Contrôle des versions du document</h3>
				<div class="overflow-hidden rounded-lg border border-gray-700 bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-gray-700">
						<thead>
							<tr>
								<th colspan="3" class="px-4 py-3 text-left font-semibold text-white bg-slate-900 border border-gray-700">
									CONTRÔLE DES VERSIONS DU DOCUMENT
								</th>
							</tr>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-gray-600 border border-gray-700">
									Version
								</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-gray-600 border border-gray-700">
									Date
								</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-gray-600 border border-gray-700">
									Modification
								</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-gray-600 border border-gray-700">
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{#each versionRows as row, i}
								<tr class="border border-gray-700">
									<td class="px-4 py-2 text-black border border-gray-700 bg-white">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
											type="text"
											bind:value={versionRows[i].version}
										/>
									</td>
									<td class="px-4 py-2 text-black border border-gray-700 bg-white">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
											type="text"
											bind:value={versionRows[i].date}
										/>
									</td>
									<td class="px-4 py-2 text-black border border-gray-700 bg-white">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
											type="text"
											bind:value={versionRows[i].modification}
										/>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<div class="flex gap-2">
					<button
						type="button"
						class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
						on:click={ajouterLigneVersion}
					>
						+ Ajouter une ligne
					</button>
					{#if versionRows.length > 1}
						<button
							type="button"
							class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
							on:click={() => supprimerLigneVersion(versionRows.length - 1)}
						>
							- Supprimer la dernière ligne
						</button>
					{/if}
				</div>
			</section>
		</section>
	{:else if activeSection === 'registre-classification'}
		<section class="space-y-6">
			<h2 class="text-xl font-semibold text-gray-900">Registre de classification des actifs informationnels</h2>
			
			<p class="text-gray-700">
				Ligne de saisie pour le registre de classification des actifs informationnels.
			</p>

			<!-- Boutons pour ajouter/supprimer des lignes -->
			<div class="flex gap-2">
				<button
					type="button"
					class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
					on:click={ajouterLigneRegistre}
				>
					+ Ajouter une ligne
				</button>
				{#if registreRows.length > 1}
					<button
						type="button"
						class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
						on:click={() => supprimerLigneRegistre(registreRows.length - 1)}
					>
						- Supprimer la dernière ligne
					</button>
				{/if}
			</div>

			<!-- Tableau principal du registre -->
			<div class="overflow-x-auto rounded-lg border border-black bg-white shadow-sm">
				<table class="min-w-full text-xs border-collapse border border-black">
					<thead>
						<!-- Ligne des titres principaux (1 à 6) -->
						<tr>
							<th rowspan="2" class="px-2 py-2 text-center font-semibold text-black bg-yellow-400 border border-black min-w-[50px]">
								ID
							</th>
							<th rowspan="2" class="px-2 py-2 text-center font-semibold text-black bg-yellow-400 border border-black min-w-[50px]">
								ID PS
							</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-400 border border-black min-w-[150px]">
								1 – Identification du processus métier
							</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-400 border border-black min-w-[150px]">
								2 – Identification de l'activité / Sous‑processus
							</th>
							<th colspan="2" class="px-2 py-2 text-center font-semibold text-black bg-yellow-400 border border-black">
								3 - Identification des actifs et leurs catégorie
							</th>
							<th colspan="2" class="px-2 py-2 text-center font-semibold text-black bg-yellow-400 border border-black">
								4 - Identification du type d'actif
							</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-400 border border-black min-w-[120px]">
								5 - Identification du propriétaire de l'actif
							</th>
							<th colspan="4" class="px-2 py-2 text-center font-semibold text-black bg-yellow-400 border border-black">
								6 - Classification des actifs sur la base d'une échelle d'impacts fixée
							</th>
							<th rowspan="2" class="px-2 py-2 text-center font-semibold text-white bg-blue-400 border border-black min-w-[150px]">
								Commentaire
							</th>
						</tr>
						<!-- Ligne des sous-titres -->
						<tr>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-300 border border-black min-w-[150px]">
								Processus métier
							</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-300 border border-black min-w-[150px]">
								Activité/Sous‑processus
							</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-300 border border-black min-w-[150px]">
								Désignation de l'actif informationnel
							</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-300 border border-black min-w-[150px]">
								Description de l'actif
							</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-300 border border-black min-w-[120px]">
								Catégorie de l'actif
							</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-300 border border-black min-w-[120px]">
								Type de l'actif
							</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-300 border border-black min-w-[120px]">
								Propriétaire de l'actif
							</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-300 border border-black min-w-[100px]">
								Besoin en terme de Disponibilité
							</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-300 border border-black min-w-[100px]">
								Besoin en terme d'Intégrité
							</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-300 border border-black min-w-[100px]">
								Besoin en terme de Confidentialité
							</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-300 border border-black min-w-[100px]">
								Sensibilité de l'actif°
							</th>
						</tr>
					</thead>
					<tbody>
						{#each registreRows as row, i}
							<tr class="border border-black">
								<!-- ID -->
								<td class="px-2 py-1 text-center border border-black bg-white">
									<input
										class="w-full text-center border border-gray-300 rounded px-1 py-0.5 text-xs"
										type="text"
										bind:value={registreRows[i].id}
									/>
								</td>
								<!-- ID PS -->
								<td class="px-2 py-1 text-center border border-black bg-white">
									<input
										class="w-full text-center border border-gray-300 rounded px-1 py-0.5 text-xs"
										type="text"
										bind:value={registreRows[i].id_ps}
									/>
								</td>
								<!-- Processus métier -->
								<td class="px-2 py-1 border border-black bg-white">
									<input
										class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs"
										type="text"
										bind:value={registreRows[i].processus_metier}
									/>
								</td>
								<!-- Activité/Sous-processus -->
								<td class="px-2 py-1 border border-black bg-white">
									<input
										class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs"
										type="text"
										bind:value={registreRows[i].activite_sous_processus}
									/>
								</td>
								<!-- Désignation de l'actif -->
								<td class="px-2 py-1 border border-black bg-white">
									<input
										class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs"
										type="text"
										bind:value={registreRows[i].designation_actif}
									/>
								</td>
								<!-- Description de l'actif -->
								<td class="px-2 py-1 border border-black bg-white">
									<textarea
										class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs min-h-[40px]"
										bind:value={registreRows[i].description_actif}
									></textarea>
								</td>
								<!-- Catégorie de l'actif -->
								<td class="px-2 py-1 border border-black bg-white">
									<input
										class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs"
										type="text"
										bind:value={registreRows[i].categorie_actif}
									/>
								</td>
								<!-- Type de l'actif -->
								<td class="px-2 py-1 border border-black bg-white">
									<input
										class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs"
										type="text"
										bind:value={registreRows[i].type_actif}
									/>
								</td>
								<!-- Propriétaire de l'actif (Section 5) -->
								<td class="px-2 py-1 border border-black bg-white">
									<input
										class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs"
										type="text"
										bind:value={registreRows[i].proprietaire_actif}
										placeholder="Nom du propriétaire"
									/>
								</td>
								<!-- Disponibilité (Section 6) -->
								<td class={`px-2 py-1 border border-black ${getNiveauBesoinBg(row.disponibilite)}`}>
									<select
										class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs bg-transparent"
										bind:value={registreRows[i].disponibilite}
										on:change={() => calculerSensibilite(i)}
									>
										<option value="">--</option>
										<option value="Faible">Faible</option>
										<option value="Moyen">Moyen</option>
										<option value="Élevé">Élevé</option>
										<option value="Très élevé">Très élevé</option>
									</select>
								</td>
								<!-- Intégrité (Section 6) -->
								<td class={`px-2 py-1 border border-black ${getNiveauBesoinBg(row.integrite)}`}>
									<select
										class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs bg-transparent"
										bind:value={registreRows[i].integrite}
										on:change={() => calculerSensibilite(i)}
									>
										<option value="">--</option>
										<option value="Faible">Faible</option>
										<option value="Moyen">Moyen</option>
										<option value="Élevé">Élevé</option>
										<option value="Très élevé">Très élevé</option>
									</select>
								</td>
								<!-- Confidentialité (Section 6) -->
								<td class={`px-2 py-1 border border-black ${getNiveauBesoinBg(row.confidentialite)}`}>
									<select
										class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs bg-transparent"
										bind:value={registreRows[i].confidentialite}
										on:change={() => calculerSensibilite(i)}
									>
										<option value="">--</option>
										<option value="Faible">Faible</option>
										<option value="Moyen">Moyen</option>
										<option value="Élevé">Élevé</option>
										<option value="Très élevé">Très élevé</option>
									</select>
								</td>
								<!-- Sensibilité de l'actif (Section 6 - Calculée automatiquement comme moyenne de D/I/C) -->
								<td class={`px-2 py-1 text-center border border-black ${getNiveauBesoinBg(row.sensibilite)}`}>
									<span class="text-xs font-semibold">{row.sensibilite || '--'}</span>
								</td>
								<!-- Commentaire -->
								<td class="px-2 py-1 border border-black bg-white">
									<textarea
										class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs min-h-[40px]"
										bind:value={registreRows[i].commentaire}
									></textarea>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			
		</section>
	{:else if activeSection === 'aide-classification'}
		<section class="space-y-8">
			<h2 class="text-xl font-semibold text-gray-900">Aide-Classification</h2>

			<!-- Tableau 1 – Définitions générales D/I/C -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">
					Tableau 1 – Disponibilité, Intégrité, Confidentialité (définitions générales)
				</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								{#each dicCriteriaRows as criteria, i}
									<th
										class="px-4 py-2 text-left font-semibold text-black border border-black bg-sky-200"
									>
										<input
											class="w-full border border-transparent bg-transparent font-semibold"
											type="text"
											bind:value={dicCriteriaRows[i].critere}
										/>
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							<tr class="border border-black">
								{#each dicCriteriaRows as criteria, i}
									<td class="px-4 py-2 text-black border border-black bg-white align-top">
										<textarea
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm min-h-[80px]"
											bind:value={dicCriteriaRows[i].definition}
										></textarea>
									</td>
								{/each}
							</tr>
						</tbody>
					</table>
				</div>
			</section>

			<!-- Tableau 1.2 – Niveaux de valeur par critère (D / I / C) -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">
					Tableau 1.2 – Niveaux de valeur par critère (D / I / C)
				</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th
									class="px-4 py-2 text-left font-semibold text-black bg-sky-200 border border-black"
								>
									Valeur
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-black bg-sky-200 border border-black"
								>
									Disponibilité (D)
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-black bg-sky-200 border border-black"
								>
									Intégrité (I)
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-black bg-sky-200 border border-black"
								>
									Confidentialité (C)
								</th>
							</tr>
						</thead>
						<tbody>
							{#each dicNiveauxRows as row, i}
								<tr class="border border-black">
									<td
										class={`px-4 py-2 font-semibold text-white border border-black ${getValeurBg(row.valeur)}`}
									>
										<input
											class="w-full border border-transparent bg-transparent font-semibold text-white"
											type="text"
											bind:value={dicNiveauxRows[i].valeur}
										/>
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top text-xs">
										<textarea
											class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[100px]"
											bind:value={dicNiveauxRows[i].disponibilite}
										></textarea>
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top text-xs">
										<textarea
											class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[100px]"
											bind:value={dicNiveauxRows[i].integrite}
										></textarea>
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top text-xs">
										<textarea
											class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[100px]"
											bind:value={dicNiveauxRows[i].confidentialite}
										></textarea>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>

			<!-- Tableau 2 – Catégories d'actifs -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">Tableau 2 – Catégories d'actifs</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th
									class="px-4 py-3 text-left font-semibold text-black bg-sky-200 border border-black"
								>
									Catégories d'actifs
								</th>
								<th class="px-4 py-3 text-left font-semibold text-black bg-sky-200 border border-black">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each categoriesActifsRows as categorie, i}
								<tr class="border border-black">
									<td class="px-4 py-2 text-black border border-black bg-white text-center">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm text-center"
											type="text"
											bind:value={categoriesActifsRows[i]}
										/>
									</td>
									<td class="px-4 py-2 border border-black bg-gray-100">
										<div class="flex gap-1 justify-center">
											<button
												type="button"
												class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
												on:click={() => insererCategorieActifAvant(i)}
												title="Ajouter avant"
											>
												↑+
											</button>
											<button
												type="button"
												class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
												on:click={() => insererCategorieActifApres(i)}
												title="Ajouter après"
											>
												↓+
											</button>
											<button
												type="button"
												class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
												on:click={() => supprimerCategorieActif(i)}
												title="Supprimer"
											>
												✕
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<div class="flex gap-2">
					<button
						type="button"
						class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
						on:click={ajouterCategorieActif}
					>
						+ Ajouter une catégorie
					</button>
					{#if categoriesActifsRows.length > 1}
						<button
							type="button"
							class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
							on:click={() => supprimerCategorieActif(categoriesActifsRows.length - 1)}
						>
							- Supprimer la dernière catégorie
						</button>
					{/if}
				</div>
			</section>

			<!-- Tableau 3 – Propriétaires des actifs -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">Tableau 3 – Propriétaires des actifs</h3>
				<div
					class="rounded-lg border-2 border-green-600 bg-green-50 p-4 shadow-sm flex gap-4 items-start"
				>
					<div class="bg-white px-4 py-2 rounded border border-green-400 flex-shrink-0">
						<p class="font-semibold text-gray-900">Propriétaires des actifs</p>
					</div>
					<div class="flex-1">
						<p class="text-sm text-gray-800">
							Chaque actif informationnel doit être attribué formellement à un propriétaire qui a
							la responsabilité de la gestion des actifs informationnels qui lui sont attribués
							(inventaire, classification, protection, destruction, réforme …) tout au long de
							leurs cycles de vie.
						</p>
					</div>
				</div>
			</section>
		</section>

















{:else if activeSection === 'cartographie-risques'}
	<section class="space-y-6">
		<h2 class="text-xl font-semibold text-gray-900">Cartographie des risques</h2>

		<!-- Tableau de cartographie - Flexible avec hauteur augmentée -->
			<!-- Toolbar: switchable sub-views for cartographie -->
			<div class="flex items-center justify-between mb-2">
				<div class="flex gap-2">
					<button type="button" class={`px-3 py-1 text-sm rounded-md border ${cartoView==='identification' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} on:click={() => (cartoView='identification')}>Identification</button>
					<button type="button" class={`px-3 py-1 text-sm rounded-md border ${cartoView==='brut' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} on:click={() => (cartoView='brut')}>Risque Brut</button>
					<button type="button" class={`px-3 py-1 text-sm rounded-md border ${cartoView==='net' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} on:click={() => (cartoView='net')}>Degré & Risque Net</button>
					<button type="button" class={`px-3 py-1 text-sm rounded-md border ${cartoView==='ptr' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} on:click={() => (cartoView='ptr')}>PTR + Résiduel</button>
					<button type="button" class={`px-3 py-1 text-sm rounded-md border ${cartoView==='all' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} on:click={() => (cartoView='all')}>Tout</button>
				</div>
				<p class="text-xs text-gray-500">Affiche uniquement la sous-partie sélectionnée pour une meilleure lisibilité.</p>
			</div>

			<div class="overflow-x-auto rounded-lg border border-black bg-white shadow-sm" class:view-all={cartoView==='all'} class:view-identification={cartoView==='identification'} class:view-brut={cartoView==='brut'} class:view-net={cartoView==='net'} class:view-ptr={cartoView==='ptr'}>
				<table class="min-w-full text-xs border-collapse border border-black">
					<!-- Colgroup: 45 colonnes (removed empty Code Risques & F.R), classes par groupe pour masquage via CSS -->
					<colgroup>
						<!-- cols 1-20 : identification (removed 2 empty cols, was 3-22) -->
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<!-- cols 21-32 : risque brut (was 23-34) -->
						<col class="col-brut" />
						<col class="col-brut" />
						<col class="col-brut" />
						<col class="col-brut" />
						<col class="col-brut" />
						<col class="col-brut" />
						<col class="col-brut" />
						<col class="col-brut" />
						<col class="col-brut" />
						<col class="col-brut" />
						<col class="col-brut" />
						<col class="col-brut" />
						<!-- cols 33-38 : degré + risque net (was 35-40) -->
						<col class="col-net" />
						<col class="col-net" />
						<col class="col-net" />
						<col class="col-net" />
						<col class="col-net" />
						<col class="col-net" />
						<!-- cols 39-45 : PTR + risque résiduel (was 41-47) -->
						<col class="col-ptr" />
						<col class="col-ptr" />
						<col class="col-ptr" />
						<col class="col-ptr" />
						<col class="col-ptr" />
						<col class="col-ptr" />
						<col class="col-ptr" />
					</colgroup>

					<!-- Dynamic headers per view: hide original thead, show correct headers for each view -->
					{#if cartoView === 'identification'}
						<thead>
							<tr>
								<th colspan="20" class="px-4 py-3 text-center font-bold text-lg text-white bg-teal-700 border border-black">
									IDENTIFICATION DES RISQUES
								</th>
							</tr>
							<tr>
								<th class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black">Entité</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black">Domaine / Processus</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black">Activités</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">Description du scénario</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">Code Risque</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">Description du scénario</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">ISO 27001</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">Famille de risque</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">Source</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">Famille de causes</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">Propriétaire du risque</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-red-700 border border-black">Matériel informatique</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-red-700 border border-black">Application</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-red-700 border border-black">Équipements sécurité</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-red-700 border border-black">Équipements réseaux</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-red-700 border border-black">Ressources humaines</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-red-700 border border-black">Document</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-red-700 border border-black">Données</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-green-600 border border-black">D</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-green-600 border border-black">I</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-green-600 border border-black">C</th>
							</tr>
						</thead>
					{:else if cartoView === 'brut'}
						<thead>
							<tr>
								<th colspan="14" class="px-4 py-3 text-center font-bold text-lg text-black bg-yellow-400 border border-black">
									RISQUE BRUT - ÉVALUATION DE LA CRITICITÉ
								</th>
							</tr>
							<tr>
								<th class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">Code Risque</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">Description du scénario</th>
								<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Impact disponibilité</th>
								<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Impact intégrité </th>
								<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Impact confidentialité</th>
								<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Criticité actif</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-orange-600 border border-black">Impact Financier</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-orange-600 border border-black">Impact Parties prenantes</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-orange-600 border border-black">Impact Réputation</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-orange-600 border border-black">Impact Réglementaire</th>
								<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Gravité des impacts</th>
								<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Probabilité</th>
								<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">I*P*C</th>
								<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Risque Brut</th>
							</tr>
						</thead>
					{:else if cartoView === 'net'}
						<thead>
							<tr>
								<th colspan="8" class="px-4 py-3 text-center font-bold text-lg text-white bg-teal-600 border border-black">
									DEGRÉ D'EXPOSITION + RISQUE NET
								</th>
							</tr>
							<tr>
								<th class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">Code Risque</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">Description du scénario</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">Dispositif de Maîtrise</th>
								<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Criticité actif</th>
								<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Gravité des impacts</th>
								<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Probabilité</th>
								<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">I*P*C</th>
								<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Risque Net</th>
							</tr>
						</thead>
					{:else if cartoView === 'ptr'}
						<thead>
							<tr>
								<th colspan="9" class="px-4 py-3 text-center font-bold text-lg text-white bg-gray-600 border border-black">
									PLAN DE TRAITEMENT + RISQUE RÉSIDUEL
								</th>
							</tr>
							<tr>
								<th class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black">Code Risque</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black">Description du scénario</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black">Action PTR</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black">Décision</th>
								<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Criticité actif</th>
								<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Impact</th>
								<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Vraissemblance</th>
								<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">I*P*C</th>
								<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Risque Résiduel</th>
							</tr>
						</thead>
					{:else}
						<!-- View 'all': show original complex headers (hidden by default, shown when cartoView === 'all') -->
						<thead style="display: none;">
							<tr>
								<th colspan="45" class="px-4 py-3 text-center font-bold text-lg text-black border border-black bg-white">
									CARTOGRAPHIE DES RISQUES DE SECURITÉ DES SYSTÈMES D'INFORMATION
								</th>
							</tr>
						</thead>
					{/if}

					<!-- Old complex headers (show only when cartoView==='all') -->
					{#if cartoView === 'all'}
					<thead>
					<!-- Ligne 1: Titre principal -->
					<tr>
						<th colspan="45" class="px-4 py-3 text-center font-bold text-lg text-black border border-black bg-white">
							CARTOGRAPHIE DES RISQUES DE SECURITÉ DES SYSTÈMES D'INFORMATION
						</th>
					</tr>
					
					<!-- Ligne 5: Sections principales -->
					<tr>
						<th colspan="3" class="px-2 py-3 text-center font-bold text-black bg-white border border-black">
							Cartographie des Processus
						</th>
						<th colspan="17" class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">
							Identification des risques inhérents
						</th>
						<th colspan="12" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">
							Évaluation de la Criticité du Risque Brut
						</th>
						<th class="px-2 py-3 text-center font-bold text-white bg-teal-600 border border-black">
							Détermination du degré d'exposition aux risques
						</th>
						<th colspan="5" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">
							Évaluation de la Criticité du Risque Net
						</th>
						<th colspan="2" class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black">
							Plan de traitement des risques (PTR)
						</th>
						<th colspan="5" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">
							Évaluation du Risque Résiduel
						</th>
					</tr>
					
					<!-- Ligne 6-7: Headers détaillés -->
					<tr>
						
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black" style="min-width: 80px;">
							Entité
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black" style="min-width: 150px;">
							Domaine / Processus
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black" style="min-width: 180px;">
							Activités
						</th>
						
						<!-- Identification risques -->
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black" style="min-width: 200px;">
							Description du scénario du Risque
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black" style="min-width: 100px;">
							Code<br/>Risque
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black" style="min-width: 100px;">
							Mesure ISO27001, annexe A
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black" style="min-width: 120px;">
							Famille<br/>de risque
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black" style="min-width: 100px;">
							Source
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black" style="min-width: 140px;">
							Famille de causes
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black" style="min-width: 100px;">
							Propriétaire<br/>du risque
						</th>
						
						<!-- Catégories d'actifs -->
						<th colspan="7" class="px-2 py-3 text-center font-bold text-white bg-red-700 border border-black">
							Catégorie d'actifs informationnels directement concernés
						</th>
						
						<!-- Critères d'impact -->
						<th colspan="3" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">
							Critères d'impact
						</th>
						
						<!-- Impact DIC -->
						<th colspan="3" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">
							Impact DIC
						</th>
						
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 100px;">
							Criticité de l'actif - Besoin de SOCIETE en SSI
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-orange-600 border border-black" style="min-width: 80px;">
							Impact Financier
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-orange-600 border border-black" style="min-width: 80px;">
							Impact Parties prenantes
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-orange-600 border border-black" style="min-width: 80px;">
							Impact sur la Réputation
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-orange-600 border border-black" style="min-width: 80px;">
							Impacts Réglementaire
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 80px;">
							Gravité des impacts
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 80px;">
							Probabilité d'Occurrence
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 70px;">
							I*P*C
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 100px;">
							Signification du risque brut
						</th>
						
						<!-- Dispositif -->
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black" style="min-width: 200px;">
							Description du Dispositif de Maitrise des Risques
						</th>
						
						<!-- Risque Net -->
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 100px;">
							Criticité de l'actif - Besoin de SOCIETE en SSI
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 80px;">
							Gravité des impacts
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 80px;">
							Probabilité<br/>d'Occurrence
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 70px;">
							I*P*C
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 100px;">
							Signification du risque net
						</th>
						
						<!-- PTR -->
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black" style="min-width: 200px;">
							Action à mettre en place
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black" style="min-width: 100px;">
							Décision
						</th>
						
						<!-- Risque Résiduel -->
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 100px;">
							Criticité de l'actif - Besoin de SOCIETE en SSI
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 70px;">
							Impact
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 80px;">
							Vraissemblance
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 70px;">
							I*P*C
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 100px;">
							Niveau du risque résiduel
						</th>
					</tr>
					
					<!-- Ligne 7: Sous-headers catégories actifs + DIC -->
					<tr>
						<!-- Catégories actifs -->
						<th class="px-2 py-3 text-center font-bold text-white bg-cyan-600 border border-black" style="min-width: 70px;">
							Matériel informatique
						</th>
						<th class="px-2 py-3 text-center font-bold text-white bg-cyan-600 border border-black" style="min-width: 70px;">
							Application
						</th>
						<th class="px-2 py-3 text-center font-bold text-white bg-cyan-600 border border-black" style="min-width: 70px;">
							Equipements sécurité
						</th>
						<th class="px-2 py-3 text-center font-bold text-white bg-cyan-600 border border-black" style="min-width: 70px;">
							Equipements réseaux
						</th>
						<th class="px-2 py-3 text-center font-bold text-white bg-cyan-600 border border-black" style="min-width: 70px;">
							Ressources humaines
						</th>
						<th class="px-2 py-3 text-center font-bold text-white bg-cyan-600 border border-black" style="min-width: 70px;">
							Document
						</th>
						<th class="px-2 py-3 text-center font-bold text-white bg-cyan-600 border border-black" style="min-width: 70px;">
							Données
						</th>
						
						<!-- Critères impact -->
						<th class="px-2 py-3 text-center font-bold text-white bg-green-600 border border-black" style="min-width: 40px;">
							D
						</th>
						<th class="px-2 py-3 text-center font-bold text-white bg-green-600 border border-black" style="min-width: 40px;">
							I
						</th>
						<th class="px-2 py-3 text-center font-bold text-white bg-green-600 border border-black" style="min-width: 40px;">
							C
						</th>
						
						<!-- Impact DIC -->
						<th class="px-2 py-3 text-center font-bold text-white bg-orange-600 border border-black" style="min-width: 40px;">
							D
						</th>
						<th class="px-2 py-3 text-center font-bold text-white bg-orange-600 border border-black" style="min-width: 40px;">
							I
						</th>
						<th class="px-2 py-3 text-center font-bold text-white bg-orange-600 border border-black" style="min-width: 40px;">
							C
						</th>
					</tr>
				</thead>
				{/if}
				
				<tbody>
					<!-- Ligne séparateur famille de risques -->
					<tr class="bg-teal-700">
				<td colspan="45" class="px-3 py-3 font-bold text-white border border-black">
					1- Sinistres physiques / Evènements naturels / Perturbations dues aux rayonnements
				</td>
			</tr>
			
			<tr class="hover:bg-gray-50">
				<!-- Entité -->
				<td class="px-2 py-2 border border-black bg-white align-top">
					<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
				</td>
				
				<!-- Domaine / Processus -->
				<td class="px-2 py-2 border border-black bg-white align-top">
					<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
				</td>
				
				<!-- Activités -->
				<td class="px-2 py-2 border border-black bg-white align-top">
					<textarea class="w-full text-xs p-1 resize-none" rows="4">Gestion de l'infrastructure IT & Réseau</textarea>
				</td>
				
				<!-- Description du scénario -->
				<td class="px-2 py-2 border border-black bg-white align-top">
					<textarea class="w-full text-xs p-1 resize-none" rows="6">Dégâts au niveau des infrastructures et installations informatiques au niveau de la salle des machines à cause de catastrophes naturelles (Montée d'eau, inondations, incendie, etc…).</textarea>
				</td>
				
				<!-- Code Risque -->
				<td class="px-2 py-2 border border-black bg-white align-top">
					<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-SP-001</textarea>
				</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">7.3
7.13</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Sinistres physiques / Evènements naturels</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Externe</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Catastrophes Environnementales</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50">

						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Gestion de l'infrastructure IT & Réseau</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Incendie en salle serveur (pouvant être causé par un court-circuit électrique, un incendie dans un local adjacent, …) entraînant une destruction des équipements </textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-SP-002</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">7.3
7.6</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Sinistres physiques / Evènements naturels</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Catastrophes Environnementales</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50">
						<!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Gestion de l'infrastructure IT & Réseau</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Dégâts des eaux en Salle serveur par écoulement d'eau venant d'une fuite de canalisations ou de la terasse et entraînant une destruction des équipements stockés</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-SP-003</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">7.3
7.4
7.5
7.6</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Sinistres physiques / Evènements naturels</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Externe</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Catastrophes Environnementales</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50">
						<!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Gestion de l'infrastructure IT & Réseau</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Dégâts des eaux en Salle Serveur dûs à un fort taux d'humidité et entraînant une destruction des équipements stockés</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-SP-004</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">7.3
7.6</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Sinistres physiques / Evènements naturels</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Catastrophes Environnementales</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50">

						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Gestion de l'infrastructure IT & Réseau</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Liquides renversés accidentellement sur un équipement en salle serveur</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-SP-005</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">7.3
7.13</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Sinistres physiques / Evènements naturels</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Catastrophes Environnementales</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<!-- Ligne séparateur famille de risques -->
					<tr class="bg-teal-700">
						<td colspan="45" class="px-3 py-3 font-bold text-white border border-black">
							2 - Perte de services essentiels
						</td>
					</tr>
					
					<tr class="hover:bg-gray-50">
						<!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Défaillance de la climatisation entraînant un accroissement de la température en Salle Serveur et occasionnant une dégradation des performances des équipements</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-PSE-001</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">7.3</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Perte de services essentiels</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Défaillance SI</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50">

						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Perte d'alimentation énergétique dûe à l'incapacité de REDAL de fournir ses services d'électricité et entraînant en conséquence l'arrêt des systèmes de SOCIETE</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-PSE-002</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">7.3
7.11
7.13
5.19</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Perte de services essentiels</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Externe</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Défaillance prestataire des services</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50">

						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Sécurité SI</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Perte d'alimentation énergétique dûe à l'instabilité des services d'électricité de SOCIETE et entraînant en conséquence l'arrêt des systèmes de SOCIETE</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-PSE-003</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">7.3</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Perte de services essentiels</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Défaillance SI</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50">

						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Sécurité SI</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Indisponibilité/ dégradation du service suite à une saturation des ressources sur un service ou un système mutualisé non suffisamment dimensionné.</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-PSE-004</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">8.6</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Perte de services essentiels</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Défaillance SI</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50">

						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Interruption de service et/ou perte de données critiques due à la défaillance matérielle ou logicielle du système</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-PSE-005</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">8.19
7.13</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Perte de services essentiels</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Défaillance SI</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Interruption de service dans certains systèmes névralgiques dû à la dépendance et/ou à la défaillance des prestataires (hébergeur, infogérant, …)</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-PSE-006</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">7.11
7.13
5.19</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Perte de services essentiels</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Choix stratégique</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<!-- Ligne séparateur famille de risques -->
					<tr class="bg-teal-700">
						<td colspan="45" class="px-3 py-3 font-bold text-white border border-black">
							3 - Compromission des informations
						</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Un utilisateur légitime (collaborateur de SOCIETE) branché sur le réseau intercepte des packets circulant sur le réseau entraînant des compromissions des données sensibles (login/mdp, données de porteurs de carte, ...)</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-CI-001</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">8.20
8.21</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Compromission des informations</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Facteurs Humains</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Cheval de troie, Ver sur un Serveur ou Poste de travail occasionnant la fuite, l'atération, la corruption et l'indisponibilité des données critiques vers un système malveillant</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-CI-002</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">5.17
8.20</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Compromission des informations</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne ou externe</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Défaillance SI</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Infection par un rançonlogiciel d'un ou plusieurs équipement du parc informatique</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-CI-003</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">8.19
8.23</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Compromission des informations</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne ou externe</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Défaillance SI</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Une attaque informatique suite à une exploitation d'une vulnérabilité technique relative à l'absence des mises à jour d'un composant technique</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-CI-004</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">8.8</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Compromission des informations</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne ou externe</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Défaillance SI</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Attaque informatique exploitant une vulnérabilité technique relative à l'obsolescence d'un composant technique </textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-CI-005</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">8.8</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Compromission des informations</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Défaillance SI</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Dysfonctionnement des activités de SOCIETE dû à l'obsolescence des applications SI </textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-CI-006</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">8.26</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Compromission des informations</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Défaillance SI</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Vol de supports/postes de travail ou fuite de documents renfermant les données critiques de SOCIETE, des bureaux opéré par un personnel interne</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-CI-007</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">8.1
8.12
7.8
7.9</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Compromission des informations</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Facteurs Humains</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Vol de supports ou fuite de documents renfermant les données critiques de SOCIETE, des bureaux ou par fouille de poubelle opéré par un personnel légitime (personnel de ménage soudoyé, prestataire…)</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-CI-008</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">7.8
7.10
8.12</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Compromission des informations</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Externe</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Défaillance prestataire des services</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Recyclage d'ordinateurs dont les disques durs (ayant stocké des données critiques) n'ont pas été formatés mais qui ont été réaffectés à d'autres utilisateurs de SOCIETEou offerts à d'autres organismes (dons aux associations, …) ou délaissés dans les bureaux</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-CI-009</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">7.14</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Compromission des informations</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Défaillance SI</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Divulgation volontaire des données critiques par une personne habilitée, à des tiers dont l'intention est de nuire aux intérêts de SOCIETE</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-CI-010</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">6.3
6.6</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Compromission des informations</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Facteurs Humains</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DCH/ DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Recrutement d’un employé ayant des antécédents et/ou une morale douteuse ayant accès aux données sensibles</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-CI-011</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">6.1</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Compromission des informations</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Facteurs Humains</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DCH/ DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Endommagement des archives et documents à cause des rongeurs</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-CI-012</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">5.33</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Compromission des informations</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Externe</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Catastrophes environnementales</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Fuite d'informations critique à travers un support amovible  introduit au sein des locaux ou via impression par un personnel légitime ou un collaborateur</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-CI-013</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">8.12
7.10</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Compromission des informations</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Facteurs humains</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Fuite/Altération de données, attaque ou arrêt des activités et SI critiques suite à un incident causé par/à travers  les intérimaires qui accédent à des systèmes critiques à travers des postes non maîtrisés par la DSI</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-CI-014</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">8.12
7.10</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Compromission des informations</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Facteurs humains</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<!-- Ligne séparateur famille de risques -->
					<tr class="bg-teal-700">
						<td colspan="45" class="px-3 py-3 font-bold text-white border border-black">
							4 - Compromission des fonctions
						</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Sécurité SI</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Usurpation de droits utilisateurs en interne suite à un vol de mots de passe (essai des mots de passe d'installation ou de listes de mots de passes triviaux, passage d'un dictionnaire, attaque de force brute) entraînant un accès illicite aux systèmes , applications et bases de données </textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-CF-001</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">8.5</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Compromission des fonctions</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Facteurs Humains</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Sécurité SI</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Fraude interne opérée par un personnel qui a cumulé plusieurs habilitations pour des tâches incompatibles</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-CF-002</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">8.2
8.3</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Compromission des fonctions</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Organisation et systèmes de gestion</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Sécurité SI</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Baisse des capacités du réseau dans les locaux de SOCIETE due à une utilisation inappropriée et intensive de l'Internet ou à une saturation de réseau </textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-CF-003</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">8.20
8.21</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Compromission des fonctions</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne
Externe</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Facteurs Humains</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Sécurité SI</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Accès au partage par des personnes ne devant pas posséder ce droit et qui peut entrainer une altération/ Fuite/ Divulgation des données administratives de SOCIETE</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-CF-004</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">8.20
8.21
8.22</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Compromission des fonctions</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Facteurs Humains</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Sécurité SI</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Atteinte à la confidentialité et l'intégrité des données due à l'usurpation des moyens d'accès au compte d'Administrateur Système (Accès non autorisé ou illicite aux SI)</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-CF-005</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">8.2</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Compromission des fonctions</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne 
Externe</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Facteurs Humains</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Défaillance dans la réalisation des projets SI due à des contraintes administratives et/ou techniques et/ou force majeure "Pandémie,…"</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-CF-006</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">5.8</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Compromission des fonctions</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Organisation et systèmes de gestion</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Organisation interne RH</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Phishing: Réponse d'un utilisateur ou d'un administrateur à un courrier élèctronique pouvant entraîner une divulgation d'informations sensibles (données à caractère personnel, données secrètes d'authentification,  …) ou réaliser une opération non autorisée</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-CF-007</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">6.3</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Compromission des fonctions</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">externe</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Facteurs Humains</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DCH/ DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<!-- Ligne séparateur famille de risques -->
					<tr class="bg-teal-700">
						<td colspan="45" class="px-3 py-3 font-bold text-white border border-black">
							5 - Acte illicite
						</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Raccordement d'un poste de travail non autorisé (ne respectant pas les standards de sécurité de SOCIETE) sur le réseau de SOCIETE(exemple de poste de travail appartenant à des stagiaires, des prestataires,…) </textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-AI-001</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">8.20
8.21</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Acte illicite</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Externe</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Défaillance SI</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Intrusion sur le SI de SOCIETEdepuis l'extérieur entraînant l'interception ou/et la non disponibilité des données de SOCIETE</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-AI-002</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">8.3</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Acte illicite</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Externe</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Défaillance SI</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Perte de la disponibilité ou la confidentialité ou l'intégrité des SI de SOCIETEsuite à la divulgation ou l'explolitation des vulnérabilités techniques non corrigées, issues des audits techniques ou partagées par le DSI</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-AI-003</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">8.8</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Acte illicite</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Défaillance SI</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<!-- Ligne séparateur famille de risques -->
					<tr class="bg-teal-700">
						<td colspan="45" class="px-3 py-3 font-bold text-white border border-black">
							6 - Mise en production non maitrisée
						</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Absence d'un accompagnement de la sécurité de SOCIETEdans les projets SI qui peut induire au déploiement d'un SI avec des vulnérabilités embarquées</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-MP-001</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">5.8
8.25</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Mise en production non maitrisée</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Organisation et systèmes de gestion</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Fuites de données graves suite à une mise en production de logiciels avec des failles de sécurité latentes </textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-MP-002</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">8.12
8.29</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Mise en production non maitrisée</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Organisation et systèmes de gestion</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Atteinte à la sécurité et à la stabilité du SI suite à l'installation de correctifs ou mises à jour système</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-MP-003</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">8.8</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Mise en production non maitrisée</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Organisation et systèmes de gestion</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<!-- Ligne séparateur famille de risques -->
					<tr class="bg-teal-700">
						<td colspan="45" class="px-3 py-3 font-bold text-white border border-black">
							7 - Conformité légale et réglementaire
						</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Pénalités dues à une transgression des droits d'auteur liées à un dépassement dans l'utilisation des licences (Risque lié à une gestion non maitrisée des licences informatiques)</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-CL-001</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">5.32</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Risque Juridique</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Non conformité juridique /réglementaire</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Atteinte à la vie privée, compromission ou divulgation de données à caractère personnel (données personnels des clients ou bien des collaborateurs, fichier de salaires, prime des collaborateurs internes....)  entraînant systématiquement une violation à la loi 09-08 et donc des poursuites judiciaires</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-CL-002</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">5.34</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Risque Juridique</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Interne</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Non conformité juridique /réglementaire</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<!-- Ligne séparateur famille de risques -->
					<tr class="bg-teal-700">
						<td colspan="45" class="px-3 py-3 font-bold text-white border border-black">
							8 - Tiers
						</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Divulgation d'information ou des données des SI par un tiers</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-TIER-001</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">5.19
5.20</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Gestion des tiers</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Externe</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Défaillance prestataire des services</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Erreur dans la mise en œuvre d'une action, modification préjudiciable des SI par un tiers</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-TIER-002</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">5.19
5.20</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Gestion des tiers</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Externe</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Défaillance prestataire des services</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Non respect des délais contractuels ou dépendance à un prestataire</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-TIER-003</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">5.20
5.22</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Gestion des tiers</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Externe</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Défaillance prestataire des services</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
					<tr class="hover:bg-gray-50"><!-- Entité -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Domaine / Processus -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Systèmes d'Information</textarea>
						</td>
						
						<!-- Activités -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Exploitation du SI/Etudes et projets de développement IT</textarea>
						</td>
						
						<!-- Description du scénario -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6">Défaillance du fournisseur internet principal causant un défaut généralisé d'accès internet ,coupant les connexions au niveaux des locaux SOCIETE</textarea>
						</td>
						
						<!-- Code Risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">DSI-R-TIER-004</textarea>
						</td>
						
						<!-- Mesure ISO27001 -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">5.19
5.22</textarea>
						</td>
						
						<!-- Famille de risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Gestion des tiers</textarea>
						</td>
						
						<!-- Source -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Externe</textarea>
						</td>
						
						<!-- Famille de causes -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4">Défaillance prestataire des services</textarea>
						</td>
						
						<!-- Propriétaire du risque -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4">DSI</textarea>
						</td>
						
						<!-- Catégories actifs - checkboxes -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Critères DIC -->
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" checked /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4"  /></td>
						
						<!-- Impact DIC (formules) -->
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="4" />
						</td>
						
						<!-- Criticité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Impacts -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Gravité (=MAX) -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Probabilité -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Niveau risque brut -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- Dispositif -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..."></textarea>
						</td>
						
						<!-- Risque Net - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Net - Gravité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" />
						</td>
						
						<!-- Risque Net - Probabilité -->
						<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
							<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" />
						</td>
						
						<!-- Risque Net - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Net - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
						
						<!-- PTR - Action -->
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action..."></textarea>
						</td>
						
						<!-- PTR - Décision -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1">
								<option value="">--</option>
								<option value="Accepter" >Accepter</option>
								<option value="Réduire" selected>Réduire</option>
								<option value="Transférer" >Transférer</option>
								<option value="Éviter" >Éviter</option>
							</select>
						</td>
						
						<!-- Risque Résiduel - Criticité -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Impact -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" />
						</td>
						
						<!-- Risque Résiduel - Vraisemblance -->
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" />
						</td>
						
						<!-- Risque Résiduel - I*P*C -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">-</td>
						
						<!-- Risque Résiduel - Niveau -->
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 text-xs align-middle">-</td>
					</tr>
					
				</tbody>
			</table>
		</div>

		<!-- Note formules -->
		<div class="mt-4 p-4 bg-blue-50 border-l-4 border-blue-600">
			<p class="font-semibold text-gray-900 mb-2">Formules automatiques: </p>
			<ul class="text-sm text-gray-700 space-y-1">
				<li>• <strong>Criticité</strong> = MAX(D, I, C)</li>
				<li>• <strong>Gravité</strong> = MAX(Impact Financier, Impact PP, Impact Réputation, Impact Réglementaire)</li>
				<li>• <strong>I*P*C</strong> = Impact × Probabilité × Criticité</li>
				<li>• <strong>Niveau de risque</strong>: Faible [1-20[, Modéré [20-36[, Élevé [36-64[, Extrême [64-120]</li>
			</ul>
		</div>
	</section>


	











	{:else if activeSection === 'aide-risque'}
		<section class="space-y-8">
			<h2 class="text-xl font-semibold text-gray-900">Aide-Risque</h2>

			<!-- Tableau 1 – Échelle de probabilité / fréquence -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">
					Tableau 1&nbsp;: Échelle de probabilité / fréquence
				</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Échelle
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Définition
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Fréquence
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Désignation de la probabilité
								</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each probaRows as row, i}
								<tr class="border border-black">
									<td class="px-4 py-2 text-black border border-black bg-white">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
											type="text"
											bind:value={probaRows[i].echelle}
										/>
									</td>
									<td
										class={`px-4 py-2 border border-black ${getProbaDefBg(row.definition)}`}
									>
										<input
											class="w-full border border-transparent bg-transparent font-semibold"
											type="text"
											bind:value={probaRows[i].definition}
										/>
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top">
										<textarea
											class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[60px]"
											bind:value={probaRows[i].frequence}
										></textarea>
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top">
										<textarea
											class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[60px]"
											bind:value={probaRows[i].historique}
										></textarea>
									</td>
									<td class="px-4 py-2 border border-black bg-gray-100 text-center">
										<div class="flex gap-1 justify-center">
											<button
												type="button"
												class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
												on:click={() => insererProbaAvant(i)}
												title="Ajouter avant"
											>
												↑+
											</button>
											<button
												type="button"
												class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
												on:click={() => insererProbaApres(i)}
												title="Ajouter après"
											>
												↓+
											</button>
											<button
												type="button"
												class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
												on:click={() => supprimerProba(i)}
												title="Supprimer"
											>
												✕
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterProba}>+ Ajouter une ligne</button>
						{#if probaRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerProba(probaRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
			</section>

			<!-- Tableau 2 – Échelle d'impact -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">Tableau 2&nbsp;: Échelle d'impact</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Échelle
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Définition
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Financier
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Réputation
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Parties prenantes
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Réglementaire
								</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each impactRows as row, i}
								<tr class="border border-black">
									<td class="px-4 py-2 text-black border border-black bg-white">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
											type="text"
											bind:value={impactRows[i].echelle}
										/>
									</td>
									<td
										class={`px-4 py-2 border border-black ${getImpactDefBg(row.definition)}`}
									>
										<input
											class="w-full border border-transparent bg-transparent font-semibold"
											type="text"
											bind:value={impactRows[i].definition}
										/>
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top">
										<textarea
											class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[60px]"
											bind:value={impactRows[i].financier}
										></textarea>
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top">
										<textarea
											class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[60px]"
											bind:value={impactRows[i].reputation}
										></textarea>
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top">
										<textarea
											class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[60px]"
											bind:value={impactRows[i].parties_prenantes}
										></textarea>
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top">
										<textarea
											class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[60px]"
											bind:value={impactRows[i].reglementaire}
										></textarea>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<p class="text-xs text-gray-600">
					Les mots‑clés <strong>Financier</strong>, <strong>Réputation</strong>,
					<strong>Parties prenantes</strong> et <strong>Réglementaire</strong> doivent être
					considérés comme des axes d'analyse principaux.
				</p>
			</section>

			<!-- Tableau 3.1 – Fréquence / probabilité d'occurrence (échelle de risque) -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">
					Tableau 3.1&nbsp;: Fréquence / probabilité d'occurrence (échelle de risque)
				</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th colspan="3" class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">
									Fréquence / Probabilité d'occurrence
								</th>
							</tr>
							<tr>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black"
								>
									Échelle
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black"
								>
									Définition
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black"
								>
									Signification
								</th>
							</tr>
						</thead>
						<tbody>
							{#each frequenceRisqueRows as row, i}
								<tr class="border border-black">
									<td class="px-4 py-2 text-black border border-black bg-white">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
											type="text"
											bind:value={frequenceRisqueRows[i].echelle}
										/>
									</td>
									<td
										class={`px-4 py-2 border border-black ${getFrequenceDefBg(row.definition)}`}
									>
										<input
											class="w-full border border-transparent bg-transparent font-semibold"
											type="text"
											bind:value={frequenceRisqueRows[i].definition}
										/>
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
											type="text"
											bind:value={frequenceRisqueRows[i].signification}
										/>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>

			<!-- Tableau 3.2 – Matrice de vraisemblance du risque -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">
					Tableau 3.2&nbsp;: Matrice de vraisemblance du risque
				</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Impact du risque × Criticité de l'actif \ Vraisemblance du risque
								</th>
								{#each [1, 2, 3, 4, 5] as col}
									<th class="px-4 py-2 text-sm font-semibold border border-black bg-gray-100">
										{col}
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each matriceRisqueRows as row, i}
								<tr class="border border-black">
									<td class="px-2 py-2 text-sm border border-black bg-white">
										<input
											class="w-20 border border-gray-300 rounded px-1 py-0.5 text-sm"
											type="text"
											bind:value={matriceRisqueRows[i].libelle}
										/>
									</td>
									{#each row.valeurs as v, j}
										<td
											class={`px-2 py-2 text-xs text-center border border-black ${getMatriceCellBg(v)}`}
										>
											<input
												class="w-16 text-center border border-gray-300 rounded px-1 py-0.5 text-xs bg-transparent"
												type="number"
												bind:value={matriceRisqueRows[i].valeurs[j]}
											/>
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<p class="text-xs text-gray-600">
					Les zones vertes correspondent à la plage [1–20[ (Risque Faible), les zones jaunes à
					[20–36[, les zones orange à [36–64[ et les zones rouges à [64–120] (Risque Extrême).
				</p>
			</section>
		</section>
	{:else if activeSection === 'ptr'}
		<section class="space-y-4">
			<h2 class="text-xl font-semibold text-gray-900">PTR</h2>
			
			







{#if activeSection === 'ptr'}
	<section class="space-y-4">
		<h2 class="text-xl font-semibold text-gray-900">PTR</h2>
		<p class="text-gray-700 mb-4">
			Plan de traitement des risques (PTR)
		</p>

		<!-- Table Container -->
		<div class="overflow-x-auto border border-gray-300 rounded-lg">
			<table class="min-w-full bg-white">
				<thead>
					<tr class="bg-[#FFC000]">
						<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
							REF Risque
						</th>
						<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
							Corresp. ISO27001, annexe A
						</th>
						<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
							Propriétaire du risque
						</th>
						<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
							Niveau du risque net
						</th>
						<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
							Décision
						</th>
						<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
							ID PTR
						</th>
						<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
							Action à mettre en place
						</th>
						<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
							Type de l'action
						</th>
						<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
							Porteur de l'action
						</th>
						<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
							Priorité
						</th>
						<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
							Périodicité
						</th>
						<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
							Complexité
						</th>
						<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
							Echéance
						</th>
						<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
							Etat d'avancement
						</th>
						<th class="px-4 py-3 text-center text-sm font-bold text-gray-900 border border-gray-300">
							Actions
						</th>
					</tr>
				</thead>
				<tbody>
					{#each ptrData as row, index}
						<tr class="hover:bg-gray-50">
							<td class="px-2 py-2 border border-gray-300">
								<input
									type="text"
									value={row.refRisque}
									on:input={(e) => updateCell(index, 'refRisque', e)}
									class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded"
									placeholder=""
								/>
							</td>
							<td class="px-2 py-2 border border-gray-300">
								<input
									type="text"
									value={row.correspISO}
									on:input={(e) => updateCell(index, 'correspISO', e)}
									class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded"
									placeholder=""
								/>
							</td>
							<td class="px-2 py-2 border border-gray-300">
								<input
									type="text"
									value={row.proprietaire}
									on:input={(e) => updateCell(index, 'proprietaire', e)}
									class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded"
									placeholder=""
								/>
							</td>
							<td class="px-2 py-2 border border-gray-300">
								<select
									value={row.niveauRisque}
									on:change={(e) => updateCell(index, 'niveauRisque', e)}
									class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded"
								>
									<option value="">-</option>
									<option value="Très faible">Très faible</option>
									<option value="Faible">Faible</option>
									<option value="Moyen">Moyen</option>
									<option value="Élevé">Élevé</option>
									<option value="Très élevé">Très élevé</option>
								</select>
							</td>
							<td class="px-2 py-2 border border-gray-300">
								<select
									value={row.decision}
									on:change={(e) => updateCell(index, 'decision', e)}
									class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded"
								>
									<option value="">-</option>
									<option value="Accepter">Accepter</option>
									<option value="Réduire">Réduire</option>
									<option value="Transférer">Transférer</option>
									<option value="Éviter">Éviter</option>
								</select>
							</td>
							<td class="px-2 py-2 border border-gray-300">
								<input
									type="text"
									value={row.idPTR}
									on:input={(e) => updateCell(index, 'idPTR', e)}
									class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded"
									placeholder=""
								/>
							</td>
							<td class="px-2 py-2 border border-gray-300">
								<input
									type="text"
									value={row.action}
									on:input={(e) => updateCell(index, 'action', e)}
									class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded"
									placeholder=""
								/>
							</td>
							<td class="px-2 py-2 border border-gray-300">
								<select
									value={row.typeAction}
									on:change={(e) => updateCell(index, 'typeAction', e)}
									class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded"
								>
									<option value="">-</option>
									<option value="Préventive">Préventive</option>
									<option value="Détective">Détective</option>
									<option value="Corrective">Corrective</option>
								</select>
							</td>
							<td class="px-2 py-2 border border-gray-300">
								<input
									type="text"
									value={row.porteur}
									on:input={(e) => updateCell(index, 'porteur', e)}
									class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded"
									placeholder=""
								/>
							</td>
							<td class="px-2 py-2 border border-gray-300">
								<select
									value={row.priorite}
									on:change={(e) => updateCell(index, 'priorite', e)}
									class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded"
								>
									<option value="">-</option>
									<option value="Haute">Haute</option>
									<option value="Moyenne">Moyenne</option>
									<option value="Basse">Basse</option>
								</select>
							</td>
							<td class="px-2 py-2 border border-gray-300">
								<select
									value={row.periodicite}
									on:change={(e) => updateCell(index, 'periodicite', e)}
									class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded"
								>
									<option value="">-</option>
									<option value="Ponctuelle">Ponctuelle</option>
									<option value="Récurrente">Récurrente</option>
									<option value="Continue">Continue</option>
								</select>
							</td>
							<td class="px-2 py-2 border border-gray-300">
								<select
									value={row.complexite}
									on:change={(e) => updateCell(index, 'complexite', e)}
									class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded"
								>
									<option value="">-</option>
									<option value="Faible">Faible</option>
									<option value="Moyenne">Moyenne</option>
									<option value="Élevée">Élevée</option>
								</select>
							</td>
							<td class="px-2 py-2 border border-gray-300">
								<input
									type="date"
									value={row.echeance}
									on:input={(e) => updateCell(index, 'echeance', e)}
									class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded"
								/>
							</td>
							<td class="px-2 py-2 border border-gray-300">
								<select
									value={row.etatAvancement}
									on:change={(e) => updateCell(index, 'etatAvancement', e)}
									class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded"
								>
									<option value="">-</option>
									<option value="Non démarrée">Non démarrée</option>
									<option value="En cours">En cours</option>
									<option value="Terminée">Terminée</option>
									<option value="En retard">En retard</option>
								</select>
							</td>
							<td class="px-2 py-2 border border-gray-300 text-center">
								<div class="flex gap-1 justify-center">
									<button
										on:click={() => insererPtrAvant(index)}
										class="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
										title="Ajouter avant"
									>
										↑+
									</button>
									<button
										on:click={() => insererPtrApres(index)}
										class="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
										title="Ajouter après"
									>
										↓+
									</button>
									<button
										on:click={() => deleteRow(index)}
										class="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
										title="Supprimer cette ligne"
									>
										✕
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Add Row Button -->
		<div class="flex justify-start mt-4">
			<button
				on:click={addRow}
				class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
						clip-rule="evenodd"
					/>
				</svg>
				Ajouter une ligne
			</button>
		</div>
	</section>
{/if}

<style>
	/* Custom scrollbar for the table */
	.overflow-x-auto::-webkit-scrollbar {
		height: 8px;
	}

	.overflow-x-auto::-webkit-scrollbar-track {
		background: #f1f1f1;
		border-radius: 4px;
	}

	.overflow-x-auto::-webkit-scrollbar-thumb {
		background: #888;
		border-radius: 4px;
	}

	.overflow-x-auto::-webkit-scrollbar-thumb:hover {
		background: #555;
	}

	/* Ensure inputs don't have default browser styling */
	input[type='text'],
	input[type='date'],
	select {
		appearance: none;
		-webkit-appearance: none;
		-moz-appearance: none;
	}

	select {
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
		background-position: right 0.5rem center;
		background-repeat: no-repeat;
		background-size: 1.5em 1.5em;
		padding-right: 2.5rem;
	}
</style>






		</section>
	{:else if activeSection === 'echelle-ptr'}
		<!-- Échelle PTR : les 4 tables déjà définies -->
		<section class="space-y-6">
			<h2 class="text-xl font-semibold text-gray-900">Échelle-PTR&nbsp;: Tables 1 à 4</h2>

			<section class="space-y-4">
				<h3 class="text-lg font-semibold text-gray-900">Table 1&nbsp;: Périodicité / Durée</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Périodicité
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Durée
								</th>
							</tr>
						</thead>
						<tbody>
							{#each periodiciteRows as row, i}
								<tr class="border border-black">
									<td
										class={`px-4 py-2 text-black border border-black ${getPeriodiciteBg(row.periodicite)}`}
									>
										<input
											class="w-full border border-transparent bg-transparent"
											type="text"
											bind:value={periodiciteRows[i].periodicite}
										/>
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
											type="text"
											bind:value={periodiciteRows[i].duree}
										/>
									</td>
									<td class="px-4 py-2 border border-black bg-gray-100 text-center">
										<div class="flex gap-1 justify-center">
											<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererPeriodiciteAvant(i)} title="Ajouter avant">↑+</button>
											<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererPeriodiciteApres(i)} title="Ajouter après">↓+</button>
											<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerPeriodicite(i)} title="Supprimer">✕</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterPeriodicite}>+ Ajouter une ligne</button>
						{#if periodiciteRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerPeriodicite(periodiciteRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
			</section>

			<section class="space-y-4">
				<h3 class="text-lg font-semibold text-gray-900">Table 2&nbsp;: Niveau de complexité</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm align-top border-collapse border border-black">
						<thead>
							<tr>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Complexité
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Définition du niveau de complexité supposé
								</th>
							</tr>
						</thead>
						<tbody>
							{#each complexiteRows as row, i}
								<tr class="border border-black">
									<td
										class={`px-4 py-2 font-medium border border-black ${getComplexiteBg(row.complexite)}`}
									>
										<input
											class="w-full border border-transparent bg-transparent font-medium"
											type="text"
											bind:value={complexiteRows[i].complexite}
										/>
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white">
										<textarea
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm min-h-[80px]"
											bind:value={complexiteRows[i].definition}
										></textarea>
									</td>
									<td class="px-4 py-2 border border-black bg-gray-100 text-center">
										<div class="flex gap-1 justify-center">
											<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererComplexiteAvant(i)} title="Ajouter avant">↑+</button>
											<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererComplexiteApres(i)} title="Ajouter après">↓+</button>
											<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerComplexite(i)} title="Supprimer">✕</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterImpact}>+ Ajouter une ligne</button>
						{#if impactRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerImpact(impactRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
			</section>

			<section class="space-y-4">
				<h3 class="text-lg font-semibold text-gray-900">Table 3&nbsp;: Type de l'action</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm align-top border-collapse border border-black">
						<thead>
							<tr>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Type de l'action
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Description
								</th>
							</tr>
						</thead>
						<tbody>
							{#each typeActionRows as row, i}
								<tr class="border border-black">
									<td
										class={`px-4 py-2 font-medium border border-black ${getTypeActionBg(row.type_action)}`}
									>
										<input
											class="w-full border border-transparent bg-transparent font-medium"
											type="text"
											bind:value={typeActionRows[i].type_action}
										/>
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white">
										<textarea
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm min-h-[60px]"
											bind:value={typeActionRows[i].description}
										></textarea>
									</td>
									<td class="px-4 py-2 border border-black bg-gray-100 text-center">
										<div class="flex gap-1 justify-center">
											<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererTypeActionAvant(i)} title="Ajouter avant">↑+</button>
											<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererTypeActionApres(i)} title="Ajouter après">↓+</button>
											<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerTypeAction(i)} title="Supprimer">✕</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<div class="flex gap-2 mt-2">
					<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterTypeAction}>+ Ajouter une ligne</button>
					{#if typeActionRows.length > 1}
						<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerTypeAction(typeActionRows.length - 1)}>- Supprimer la dernière ligne</button>
					{/if}
				</div>
			</section>

			<section class="space-y-4">
				<h3 class="text-lg font-semibold text-gray-900">Table 4&nbsp;: Priorité de l'action</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th
									colspan="3"
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Priorité de l'action
								</th>
							</tr>
							<tr>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black"
								>
									Échelle
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black"
								>
									Définition
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black"
								>
									Signification (score)
								</th>
							</tr>
						</thead>
						<tbody>
							{#each prioriteRows as row, i}
								<tr class="border border-black">
									<td class="px-4 py-2 font-medium text-black border border-black bg-white">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
											type="text"
											bind:value={prioriteRows[i].echelle}
										/>
									</td>
									<td
										class={`px-4 py-2 border border-black ${getPrioriteDefinitionBg(row.echelle)}`}
									>
										<input
											class="w-full border border-transparent bg-transparent"
											type="text"
											bind:value={prioriteRows[i].definition}
										/>
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
											type="text"
											bind:value={prioriteRows[i].signification}
										/>
									</td>
									<td class="px-4 py-2 border border-black bg-gray-100 text-center">
										<div class="flex gap-1 justify-center">
											<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererPrioriteAvant(i)} title="Ajouter avant">↑+</button>
											<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererPrioriteApres(i)} title="Ajouter après">↓+</button>
											<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerPriorite(i)} title="Supprimer">✕</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterPriorite}>+ Ajouter une ligne</button>
						{#if prioriteRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerPriorite(prioriteRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
			</section>
		</section>
	{/if}
</main>