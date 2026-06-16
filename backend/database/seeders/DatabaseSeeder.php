<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::query()->updateOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => Hash::make('password'),
                'is_admin' => false,
            ],
        );

        User::query()->updateOrCreate(
            ['email' => 'admin@muppadai.local'],
            [
                'name' => 'Muppadai Admin',
                'password' => Hash::make('admin123'),
                'is_admin' => true,
            ],
        );

        $this->call(ExamCatalogSeeder::class);
    }
}
