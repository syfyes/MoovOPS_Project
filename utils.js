// Fonction de nettoyage et validation exigée par le Palier 3
function validerEtNettoyerDonnees(station, temperature) {
    // 1. Règle du Palier 1 : Ignorer si 0 vélo
    if (!station.free_bikes || station.free_bikes <= 0) {
        return null;
    }

    // 2. Test Palier 3 : Vérifier qu'aucune coordonnée n'est vide ou invalide
    if (station.latitude === undefined || station.longitude === undefined || station.latitude === null || station.longitude === null) {
        throw new Error("Coordonnées géographiques manquantes");
    }

    // 3. Test Palier 3 : Vérifier la cohérence météo (-20°C à +50°C)
    if (temperature < -20 || temperature > 50) {
        throw new Error("Température incohérente détectée");
    }

    return {
        id: station.id,
        name: station.name,
        latitude: station.latitude,
        longitude: station.longitude,
        velos: station.free_bikes,
        temp: temperature
    };
}

module.exports = { validerEtNettoyerDonnees };
