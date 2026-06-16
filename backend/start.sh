#!/bin/sh
set -e

# Ensure writable directories exist
mkdir -p storage/app/public storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
chmod -R 777 storage bootstrap/cache

# Run migrations (--force skips the production prompt)
php artisan migrate --force

# Seed exam catalog on first boot (idempotent — updateOrCreate inside)
php artisan db:seed --class=ExamCatalogSeeder --force 2>/dev/null || true

# Start the PHP built-in server on the port Railway provides
exec php artisan serve --host=0.0.0.0 --port="${PORT:-8080}"
