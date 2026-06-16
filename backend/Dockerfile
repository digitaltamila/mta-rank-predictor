FROM php:8.4-cli-alpine

WORKDIR /app

RUN apk add --no-cache \
    bash \
    ca-certificates \
    icu-dev \
    libzip-dev \
    oniguruma-dev \
    sqlite \
    unzip \
  && update-ca-certificates \
  && docker-php-ext-install \
    bcmath \
    intl \
    mbstring \
    opcache \
    pdo_mysql \
    pdo_sqlite \
    zip

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts

COPY . .

RUN composer dump-autoload --optimize --no-interaction \
  && php artisan package:discover --ansi

RUN mkdir -p storage/app/public storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
  && chmod -R 777 storage bootstrap/cache \
  && touch database/database.sqlite

RUN chmod +x start.sh

EXPOSE 8080

CMD ["sh", "start.sh"]
