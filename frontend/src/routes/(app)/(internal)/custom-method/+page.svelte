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
	function ajouterLigneDiffusion() {
		diffusionRows = [...diffusionRows, { nom: '', entite_fonction: '', date: '' }];
	}

	function supprimerLigneDiffusion(index: number) {
		diffusionRows = diffusionRows.filter((_, i) => i !== index);
	}

	function ajouterLigneVersion() {
		versionRows = [...versionRows, { version: '', date: '', modification: '' }];
	}

	function supprimerLigneVersion(index: number) {
		versionRows = versionRows.filter((_, i) => i !== index);
	}

	function ajouterCategorieActif() {
		categoriesActifsRows = [...categoriesActifsRows, ''];
	}

	function supprimerCategorieActif(index: number) {
		categoriesActifsRows = categoriesActifsRows.filter((_, i) => i !== index);
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

</script>

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
								</tr>
							{/each}
						</tbody>
					</table>
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
									class="px-4 py-3 text-center font-semibold text-black bg-sky-200 border border-black"
								>
									Catégories d'actifs
								</th>
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
	<h2 class="text-xl font-semibold text-gray-900">Cartographie des risques de sécurité SI</h2>
	
	<p class="text-gray-700">
		Ce tableau permet d'identifier, évaluer et traiter les risques de sécurité du système d'information.
	</p>

	<!-- Note explicative sur la structure -->
	<div class="p-4 bg-blue-50 border-l-4 border-blue-600">
		<p class="font-semibold text-gray-900 mb-2">Structure du tableau de cartographie des risques</p>
		<p class="text-sm text-gray-700">
			Le tableau est organisé en plusieurs sections : Cartographie des Processus, Identification des risques, 
			Évaluation du Risque Brut, Détermination de l'exposition, Risque Net, Plan de Traitement (PTR) et Risque Résiduel.
		</p>
	</div>

	<!-- Tableau de cartographie - Version scrollable horizontale -->
	<div class="overflow-x-auto rounded-lg border border-black bg-white shadow-sm">
		<table class="min-w-full text-xs border-collapse border border-black">
			<thead>
				<!-- Ligne 1 : Titre principal -->
				<tr>
					<th colspan="8" class="px-2 py-2 text-center font-bold text-black bg-white border border-black">
						
					</th>
					<th colspan="26" class="px-2 py-2 text-center font-bold text-lg border border-black bg-white">
						CARTOGRAPHIE DES RISQUES DE SECURITÉ DES SYSTÈMES D'INFORMATION
					</th>
					<th colspan="13" class="px-2 py-2 bg-white border border-black">
						<span class="px-3 py-1 bg-yellow-400 text-black font-semibold rounded">Restreint</span>
					</th>
				</tr>
				
				<!-- Ligne 2 : Sections principales -->
				<tr>
					<th rowspan="2" class="px-2 py-1 text-center font-semibold text-black bg-white border border-black min-w-[50px]">
						Code Risques
					</th>
					<th rowspan="2" class="px-2 py-1 text-center font-semibold text-black bg-white border border-black min-w-[40px]">
						F.R
					</th>
					<th colspan="3" class="px-2 py-2 text-center font-semibold text-white bg-slate-700 border border-black">
						Cartographie des Processus
					</th>
					<th colspan="17" class="px-2 py-2 text-center font-semibold text-white bg-teal-700 border border-black">
						Identification des risques inhérents
					</th>
					<th colspan="12" class="px-2 py-2 text-center font-semibold text-black bg-yellow-400 border border-black">
						Évaluation de la Criticité du Risque Brut
					</th>
					<th rowspan="2" class="px-2 py-2 text-center font-semibold text-white bg-teal-600 border border-black min-w-[120px]">
						Dispositif de Maitrise
					</th>
					<th colspan="5" class="px-2 py-2 text-center font-semibold text-black bg-yellow-400 border border-black">
						Risque Net
					</th>
					<th colspan="2" class="px-2 py-2 text-center font-semibold text-white bg-gray-600 border border-black">
						PTR
					</th>
					<th colspan="5" class="px-2 py-2 text-center font-semibold text-black bg-yellow-400 border border-black">
						Risque Résiduel
					</th>
				</tr>
				
				<!-- Ligne 3 : Sous-colonnes détaillées -->
				<tr>
					<!-- Cartographie Processus -->
					<th class="px-2 py-1 text-center font-semibold text-white bg-gray-600 border border-black min-w-[100px]">Entité</th>
					<th class="px-2 py-1 text-center font-semibold text-white bg-gray-600 border border-black min-w-[120px]">Domaine / Processus</th>
					<th class="px-2 py-1 text-center font-semibold text-white bg-gray-600 border border-black min-w-[120px]">Activités</th>
					
					<!-- Identification risques -->
					<th class="px-2 py-1 text-center font-semibold text-white bg-teal-700 border border-black min-w-[150px]">Scénario du Risque</th>
					<th class="px-2 py-1 text-center font-semibold text-white bg-teal-700 border border-black min-w-[80px]">Code Risque</th>
					<th class="px-2 py-1 text-center font-semibold text-white bg-teal-700 border border-black min-w-[80px]">ISO27001</th>
					<th class="px-2 py-1 text-center font-semibold text-white bg-teal-700 border border-black min-w-[100px]">Famille risque</th>
					<th class="px-2 py-1 text-center font-semibold text-white bg-teal-700 border border-black min-w-[80px]">Source</th>
					<th class="px-2 py-1 text-center font-semibold text-white bg-teal-700 border border-black min-w-[120px]">Famille causes</th>
					<th class="px-2 py-1 text-center font-semibold text-white bg-teal-700 border border-black min-w-[100px]">Propriétaire</th>
					
					<!-- Actifs impactés -->
					<th class="px-2 py-1 text-center font-semibold text-white bg-cyan-600 border border-black min-w-[60px]">Mat. Info</th>
					<th class="px-2 py-1 text-center font-semibold text-white bg-cyan-600 border border-black min-w-[60px]">App</th>
					<th class="px-2 py-1 text-center font-semibold text-white bg-cyan-600 border border-black min-w-[60px]">Eq. Sécu</th>
					<th class="px-2 py-1 text-center font-semibold text-white bg-cyan-600 border border-black min-w-[60px]">Eq. Réseau</th>
					<th class="px-2 py-1 text-center font-semibold text-white bg-cyan-600 border border-black min-w-[60px]">RH</th>
					<th class="px-2 py-1 text-center font-semibold text-white bg-cyan-600 border border-black min-w-[60px]">Doc</th>
					<th class="px-2 py-1 text-center font-semibold text-white bg-cyan-600 border border-black min-w-[60px]">Données</th>
					
					<!-- Critères DIC -->
					<th class="px-2 py-1 text-center font-semibold text-white bg-green-600 border border-black min-w-[40px]">D</th>
					<th class="px-2 py-1 text-center font-semibold text-white bg-green-600 border border-black min-w-[40px]">I</th>
					<th class="px-2 py-1 text-center font-semibold text-white bg-green-600 border border-black min-w-[40px]">C</th>
					
					<!-- Évaluation Risque Brut -->
					<th class="px-2 py-1 text-center font-semibold text-white bg-orange-600 border border-black min-w-[40px]">D</th>
					<th class="px-2 py-1 text-center font-semibold text-white bg-orange-600 border border-black min-w-[40px]">I</th>
					<th class="px-2 py-1 text-center font-semibold text-white bg-orange-600 border border-black min-w-[40px]">C</th>
					<th class="px-2 py-1 text-center font-semibold text-black bg-yellow-300 border border-black min-w-[70px]">Criticité</th>
					<th class="px-2 py-1 text-center font-semibold text-black bg-yellow-400 border border-black min-w-[70px]">Impact Fin.</th>
					<th class="px-2 py-1 text-center font-semibold text-black bg-yellow-400 border border-black min-w-[70px]">Impact PP</th>
					<th class="px-2 py-1 text-center font-semibold text-black bg-yellow-400 border border-black min-w-[70px]">Impact Rép.</th>
					<th class="px-2 py-1 text-center font-semibold text-black bg-yellow-400 border border-black min-w-[70px]">Impact Régl.</th>
					<th class="px-2 py-1 text-center font-semibold text-black bg-yellow-400 border border-black min-w-[60px]">Gravité</th>
					<th class="px-2 py-1 text-center font-semibold text-black bg-yellow-400 border border-black min-w-[60px]">Proba</th>
					<th class="px-2 py-1 text-center font-semibold text-black bg-yellow-400 border border-black min-w-[60px]">I*P*C</th>
					<th class="px-2 py-1 text-center font-semibold text-black bg-yellow-400 border border-black min-w-[90px]">Niveau Brut</th>
					
					<!-- Risque Net -->
					<th class="px-2 py-1 text-center font-semibold text-black bg-yellow-300 border border-black min-w-[60px]">Criticité</th>
					<th class="px-2 py-1 text-center font-semibold text-black bg-yellow-400 border border-black min-w-[60px]">Impact</th>
					<th class="px-2 py-1 text-center font-semibold text-black bg-yellow-400 border border-black min-w-[60px]">Proba</th>
					<th class="px-2 py-1 text-center font-semibold text-black bg-yellow-400 border border-black min-w-[60px]">I*P*C</th>
					<th class="px-2 py-1 text-center font-semibold text-black bg-yellow-400 border border-black min-w-[90px]">Niveau Net</th>
					
					<!-- PTR -->
					<th class="px-2 py-1 text-center font-semibold text-white bg-gray-600 border border-black min-w-[120px]">Action</th>
					<th class="px-2 py-1 text-center font-semibold text-white bg-gray-600 border border-black min-w-[80px]">Décision</th>
					
					<!-- Risque Résiduel -->
					<th class="px-2 py-1 text-center font-semibold text-black bg-yellow-300 border border-black min-w-[60px]">Criticité</th>
					<th class="px-2 py-1 text-center font-semibold text-black bg-yellow-400 border border-black min-w-[60px]">Impact</th>
					<th class="px-2 py-1 text-center font-semibold text-black bg-yellow-400 border border-black min-w-[60px]">Vraisemb.</th>
					<th class="px-2 py-1 text-center font-semibold text-black bg-yellow-400 border border-black min-w-[60px]">I*P*C</th>
					<th class="px-2 py-1 text-center font-semibold text-black bg-yellow-400 border border-black min-w-[100px]">Niveau Résiduel</th>
				</tr>
			</thead>
			<tbody>
				<!-- Ligne de séparation - Famille de risques 1 -->
				<tr class="bg-teal-700">
					<td colspan="47" class="px-3 py-2 font-bold text-white border border-black">
						1 - Sinistres physiques / Evènements naturels / Perturbations
					</td>
				</tr>
				
				<!-- Exemple de ligne de risque (à dupliquer et adapter) -->
				<tr class="border border-black hover:bg-gray-50">
					<td class="px-2 py-1 border border-black bg-white"><input class="w-full text-xs p-1 border border-gray-300 rounded" type="text" /></td>
					<td class="px-2 py-1 border border-black bg-white"><input class="w-full text-xs p-1 border border-gray-300 rounded" type="text" /></td>
					<td class="px-2 py-1 border border-black bg-white"><input class="w-full text-xs p-1 border border-gray-300 rounded" type="text" value="DSI" /></td>
					<td class="px-2 py-1 border border-black bg-white"><input class="w-full text-xs p-1 border border-gray-300 rounded" type="text" value="Systèmes d'Information" /></td>
					<td class="px-2 py-1 border border-black bg-white"><input class="w-full text-xs p-1 border border-gray-300 rounded" type="text" /></td>
					<td class="px-2 py-1 border border-black bg-white"><textarea class="w-full text-xs p-1 border border-gray-300 rounded min-h-[40px]"></textarea></td>
					<td class="px-2 py-1 border border-black bg-white"><input class="w-full text-xs p-1 border border-gray-300 rounded" type="text" /></td>
					<td class="px-2 py-1 border border-black bg-white"><input class="w-full text-xs p-1 border border-gray-300 rounded" type="text" /></td>
					<td class="px-2 py-1 border border-black bg-white"><input class="w-full text-xs p-1 border border-gray-300 rounded" type="text" /></td>
					<td class="px-2 py-1 border border-black bg-white"><input class="w-full text-xs p-1 border border-gray-300 rounded" type="text" /></td>
					<td class="px-2 py-1 border border-black bg-white"><input class="w-full text-xs p-1 border border-gray-300 rounded" type="text" /></td>
					<td class="px-2 py-1 border border-black bg-white"><input class="w-full text-xs p-1 border border-gray-300 rounded" type="text" /></td>
					<!-- Actifs - cases à cocher -->
					<td class="px-2 py-1 text-center border border-black bg-white"><input type="checkbox" class="w-4 h-4" /></td>
					<td class="px-2 py-1 text-center border border-black bg-white"><input type="checkbox" class="w-4 h-4" /></td>
					<td class="px-2 py-1 text-center border border-black bg-white"><input type="checkbox" class="w-4 h-4" /></td>
					<td class="px-2 py-1 text-center border border-black bg-white"><input type="checkbox" class="w-4 h-4" /></td>
					<td class="px-2 py-1 text-center border border-black bg-white"><input type="checkbox" class="w-4 h-4" /></td>
					<td class="px-2 py-1 text-center border border-black bg-white"><input type="checkbox" class="w-4 h-4" /></td>
					<td class="px-2 py-1 text-center border border-black bg-white"><input type="checkbox" class="w-4 h-4" /></td>
					<!-- DIC Critères -->
					<td class="px-2 py-1 text-center border border-black bg-white"><input type="checkbox" class="w-4 h-4" /></td>
					<td class="px-2 py-1 text-center border border-black bg-white"><input type="checkbox" class="w-4 h-4" /></td>
					<td class="px-2 py-1 text-center border border-black bg-white"><input type="checkbox" class="w-4 h-4" /></td>
					<!-- Impact DIC -->
					<td class="px-2 py-1 border border-black bg-gray-100"><input class="w-full text-xs p-1 bg-transparent text-center" type="number" min="1" max="4" /></td>
					<td class="px-2 py-1 border border-black bg-gray-100"><input class="w-full text-xs p-1 bg-transparent text-center" type="number" min="1" max="4" /></td>
					<td class="px-2 py-1 border border-black bg-gray-100"><input class="w-full text-xs p-1 bg-transparent text-center" type="number" min="1" max="4" /></td>
					<!-- Criticité calculée -->
					<td class="px-2 py-1 text-center font-semibold border border-black bg-yellow-200">-</td>
					<!-- Impacts -->
					<td class="px-2 py-1 border border-black bg-white"><input class="w-full text-xs p-1 border border-gray-300 rounded text-center" type="number" min="1" max="6" /></td>
					<td class="px-2 py-1 border border-black bg-white"><input class="w-full text-xs p-1 border border-gray-300 rounded text-center" type="number" min="1" max="6" /></td>
					<td class="px-2 py-1 border border-black bg-white"><input class="w-full text-xs p-1 border border-gray-300 rounded text-center" type="number" min="1" max="6" /></td>
					<td class="px-2 py-1 border border-black bg-white"><input class="w-full text-xs p-1 border border-gray-300 rounded text-center" type="number" min="1" max="6" /></td>
					<!-- Gravité -->
					<td class="px-2 py-1 text-center font-semibold border border-black bg-yellow-200">-</td>
					<!-- Probabilité -->
					<td class="px-2 py-1 border border-black bg-white"><input class="w-full text-xs p-1 border border-gray-300 rounded text-center" type="number" min="1" max="5" /></td>
					<!-- I*P*C -->
					<td class="px-2 py-1 text-center font-semibold border border-black bg-orange-200">-</td>
					<!-- Niveau brut -->
					<td class="px-2 py-1 text-center font-semibold border border-black bg-yellow-300">-</td>
					<!-- Dispositif -->
					<td class="px-2 py-1 border border-black bg-white"><textarea class="w-full text-xs p-1 border border-gray-300 rounded min-h-[40px]"></textarea></td>
					<!-- Risque Net -->
					<td class="px-2 py-1 text-center font-semibold border border-black bg-yellow-200">-</td>
					<td class="px-2 py-1 text-center font-semibold border border-black bg-yellow-200">-</td>
					<td class="px-2 py-1 text-center font-semibold border border-black bg-yellow-200">-</td>
					<td class="px-2 py-1 text-center font-semibold border border-black bg-orange-200">-</td>
					<td class="px-2 py-1 text-center font-semibold border border-black bg-yellow-300">-</td>
					<!-- PTR -->
					<td class="px-2 py-1 border border-black bg-white"><textarea class="w-full text-xs p-1 border border-gray-300 rounded min-h-[40px]"></textarea></td>
					<td class="px-2 py-1 border border-black bg-white">
						<select class="w-full text-xs p-1 border border-gray-300 rounded">
							<option value="">--</option>
							<option value="Accepter">Accepter</option>
							<option value="Réduire">Réduire</option>
							<option value="Transférer">Transférer</option>
							<option value="Éviter">Éviter</option>
						</select>
					</td>
					<!-- Risque Résiduel -->
					<td class="px-2 py-1 text-center font-semibold border border-black bg-yellow-200">-</td>
					<td class="px-2 py-1 text-center font-semibold border border-black bg-yellow-200">-</td>
					<td class="px-2 py-1 text-center font-semibold border border-black bg-yellow-200">-</td>
					<td class="px-2 py-1 text-center font-semibold border border-black bg-orange-200">-</td>
					<td class="px-2 py-1 text-center font-semibold border border-black bg-yellow-300">-</td>
				</tr>
			</tbody>
		</table>
	</div>

	<!-- Note sur les formules -->
	<div class="p-4 bg-yellow-50 border-l-4 border-yellow-500">
		<p class="font-semibold text-gray-900 mb-2">Formules de calcul</p>
		<ul class="text-sm text-gray-700 space-y-1">
			<li>• <strong>Criticité de l'actif</strong> : MAX(D, I, C) des besoins DIC</li>
			<li>• <strong>Gravité des impacts</strong> : MAX(Impact Financier, Impact Parties Prenantes, Impact Réputation, Impact Réglementaire)</li>
			<li>• <strong>I*P*C (Risque)</strong> : Impact × Probabilité × Criticité</li>
			<li>• <strong>Niveau de risque</strong> : 
				<span class="px-2 py-0.5 bg-green-400 text-xs rounded">Faible [1-20[</span>
				<span class="px-2 py-0.5 bg-yellow-300 text-xs rounded">Modéré [20-36[</span>
				<span class="px-2 py-0.5 bg-orange-400 text-xs rounded">Élevé [36-64[</span>
				<span class="px-2 py-0.5 bg-red-500 text-white text-xs rounded">Extrême [64-120]</span>
			</li>
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
								</tr>
							{/each}
						</tbody>
					</table>
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
			<p class="text-gray-700">
				Section dédiée au PTR (Plan de Traitement des Risques ou autre signification selon ta
				méthode). Cette partie sera complétée avec le contenu que tu vas m'envoyer.
			</p>
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
								</tr>
							{/each}
						</tbody>
					</table>
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
								</tr>
							{/each}
						</tbody>
					</table>
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
								</tr>
							{/each}
						</tbody>
					</table>
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
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		</section>
	{/if}
</main>