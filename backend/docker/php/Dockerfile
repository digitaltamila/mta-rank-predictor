FROM php:8.4-fpm-alpine

WORKDIR /var/www/html

RUN apk add --no-cache \
    bash \
    ca-certificates \
    icu-dev \
    libzip-dev \
    oniguruma-dev \
    unzip \
  && update-ca-certificates \
  && docker-php-ext-install \
    bcmath \
    intl \
    mbstring \
    opcache \
    pdo_mysql \
    zip \
  && pecl install redis \
  && docker-php-ext-enable redis

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts

COPY . .

RUN composer dump-autoload --optimize --no-interaction \
  && php artisan package:discover --ansi \
  && chown -R www-data:www-data storage bootstrap/cache

USER www-data

EXPOSE 9000

CMD ["php-fpm"]
