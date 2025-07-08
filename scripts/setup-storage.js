#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorage() {
  console.log('Setting up Supabase Storage...');
  
  try {
    // Create the household-photos bucket
    console.log('Creating household-photos bucket...');
    const { data, error } = await supabase.storage.createBucket('household-photos', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    });
    
    if (error && !error.message.includes('already exists')) {
      throw error;
    }
    
    console.log('Bucket created successfully or already exists');
    
    // Read and execute the SQL migration
    const migrationPath = path.join(__dirname, '../supabase/migrations/005_storage_setup.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL content into individual statements and execute them
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log('Executing storage policies...');
    
    for (const statement of statements) {
      if (statement.includes('INSERT INTO storage.buckets')) {
        // Skip bucket creation since we did it above
        continue;
      }
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      if (error) {
        console.warn(`Warning: ${error.message}`);
      }
    }
    
    console.log('Storage setup completed successfully!');
    
  } catch (error) {
    console.error('Error setting up storage:', error.message);
    process.exit(1);
  }
}

setupStorage();