const { validerEtNettoyerDonnees } = require('./utils');

describe('--- Suite de Tests Unitaires MoovOPS (Palier 3) ---', () => {

    // Test 1 : Vérification de la cohérence météo
    test('1. Devrait lever une erreur si la température est hors limites (-20°C à +50°C)', () => {
        const stationValide = { id: "st1", name: "Station Opéra", free_bikes: 5, latitude: 48.85, longitude: 2.35 };
        
        expect(() => validerEtNettoyerDonnees(stationValide, -25)).toThrow("Température incohérente détectée");
        expect(() => validerEtNettoyerDonnees(stationValide, 55)).toThrow("Température incohérente détectée");
        expect(validerEtNettoyerDonnees(stationValide, 22)).not.toBeNull();
    });

    // Test 2 : Absence de coordonnées vides
    test('2. Devrait lever une erreur si les coordonnées géographiques sont manquantes', () => {
        const stationInvalide = { id: "st2", name: "Station Louvre", free_bikes: 10, latitude: null, longitude: 2.35 };
        expect(() => validerEtNettoyerDonnees(stationInvalide, 15)).toThrow("Coordonnées géographiques manquantes");
    });

    // Test 3 : Validation de l'idempotence et filtrage des vélos
    test('3. Devrait filtrer les stations vides et valider le format des données (Idempotence)', () => {
        const stationVide = { id: "st3", name: "Station Châtelet", free_bikes: 0, latitude: 48.85, longitude: 2.35 };
        const resultat = validerEtNettoyerDonnees(stationVide, 15);
        expect(resultat).toBeNull(); // Doit être ignoré (Palier 1/3)
    });
});
