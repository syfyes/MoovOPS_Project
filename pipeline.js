const mysql = require('mysql2/promise');
const axios = require('axios');
const cron = require('node-cron');
const { validerEtNettoyerDonnees } = require('./utils');

// Configuration réseau interne à Docker (Le host correspond au nom du conteneur MySQL)
const dbConfig = {
    host: 'moovops-db', 
    user: 'moov_worker',
    password: 'Worker_Secure_Pass_2026!',
    database: 'moovops',
    port: 3306
};

async function executePipeline() {
    let connection;
    try {
        // Connexion sécurisée à la base de données isolée
        connection = await mysql.createConnection(dbConfig);
        console.log(`[${new Date().toISOString()}] ✅ Connexion MySQL établie par le conteneur applicatif.`);

        // Endpoints stables pour le projet (Vélos Paris + Météo Paris)
        const urlVelos = 'https://api.citybik.es/v2/networks/velib';
        const urlMeteo = 'https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&current_weather=true';

        console.log("🌐 Requêtage simultané des API (Promise.all)...");
        
        // Appel asynchrone et parallèle des deux APIs (Exigence CDA)
        const [resVelos, resMeteo] = await Promise.all([
            axios.get(urlVelos),
            axios.get(urlMeteo)
        ]);

        const dataVelos = resVelos.data;
        const tempActuelle = resMeteo.data.current_weather.temperature;
        console.log(`🌤️ Météo Paris récupérée avec succès : ${tempActuelle}°C`);

        // 1. Sauvegarde systématique du flux brut JSON (Exigence d'historisation Palier 1)
        await connection.execute('INSERT INTO moovops_raw (data_json) VALUES (?)', [JSON.stringify(dataVelos)]);
        console.log("💾 Flux brut JSON archivé dans 'moovops_raw'.");

        const stations = dataVelos.network.stations;
        let stationCount = 0;
        let logCount = 0;

        console.log("🧹 Validation et distribution relationnelle des données...");

        // 2. Traitement ligne par ligne avec isolation des anomalies (Try/Catch interne)
        for (const station of stations) {
            try {
                // Validation stricte via le module de test Jest (Palier 3)
                const stationValide = validerEtNettoyerDonnees(station, tempActuelle);
                
                // Si la station est valide (non filtrée et cohérente)
                if (stationValide) {
                    // Insertion ou mise à jour de la table statique (Idempotence)
                    await connection.execute(
                        `INSERT INTO stations (id, name, latitude, longitude) 
                         VALUES (?, ?, ?, ?) 
                         ON DUPLICATE KEY UPDATE name=VALUES(name), latitude=VALUES(latitude), longitude=VALUES(longitude)`,
                        [stationValide.id, stationValide.name, stationValide.latitude, stationValide.longitude]
                    );
                    stationCount++;

                    // Insertion chronologique dans la table dynamique historique
                    await connection.execute(
                        `INSERT INTO historique_dispo (id_station, velos_dispo, temperature_actuelle) 
                         VALUES (?, ?, ?)`,
                        [stationValide.id, stationValide.velos, stationValide.temp]
                    );
                    logCount++;
                }
            } catch (validationError) {
                // Bloc de sécurité : Si une station a un problème (ex: coordonnées vides), on l'ignore sans planter le script
                console.warn(`⚠️ Station [ID: ${station.id}] ignorée : ${validationError.message}`);
            }
        }

        console.log(`🎯 Fin du cycle : ${stationCount} référentiels mis à jour. ${logCount} entrées historiques enregistrées.`);

    } catch (error) {
        // Bloc try/catch global rigoureux pour intercepter les pannes majeures (ex: coupure réseau)
        console.error("❌ Erreur critique lors de l'exécution du cycle de pipeline :", error.message);
    } finally {
        // Libération systématique de la connexion réseau à chaque fin de cycle
        if (connection) {
            await connection.end();
            console.log("🔌 Déconnexion de la base de données pour ce cycle.");
        }
    }
}

// Démon de surveillance : Exécution immédiate au démarrage du conteneur
console.log("🚀 Initialisation du démon de surveillance Moov'OPS (Palier 3)...");
executePipeline(); 

// Planification récurrente automatisée : Déclenchement toutes les 10 minutes (Exigence Palier 2/3)
cron.schedule('*/10 * * * *', () => {
    console.log("⏰ Déclenchement automatique du cycle périodique (Intervalle 10 min)...");
    executePipeline();
});

