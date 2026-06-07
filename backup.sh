#!/bin/bash

# Configuration des répertoires
BACKUP_DIR="./backups"
CONTAINER_NAME="moovops-db"
DB_NAME="moovops"
DATE=$(date +"%Y-%m-%d_%H-%m-%S")
FILENAME="$BACKUP_DIR/backup_${DB_NAME}_${DATE}.sql"

# Créer le dossier s'il n'existe pas
mkdir -p $BACKUP_DIR

echo "📦 Extraction de la base de données depuis le conteneur Docker..."
# Exécution du mysqldump directement à l'intérieur du conteneur isolé
docker exec $CONTAINER_NAME mysqldump -u root --password=root_secure_password $DB_NAME > $FILENAME

echo "🗜️ Compression du fichier de sauvegarde..."
gzip $FILENAME

echo "🧹 Nettoyage automatique : Suppression des sauvegardes vieilles de plus de 3 jours..."
# Commande Linux/Mac exigée au Palier 3
find $BACKUP_DIR -name "*.sql.gz" -mtime +3 -exec rm {} \;

echo "✅ Process de sauvegarde terminé avec succès !"
