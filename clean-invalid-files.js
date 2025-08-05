
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://lseqrqmtjymukewnejdd.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZXFycW10anltdWtld25lamRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA2OTU5MzQsImV4cCI6MjAzNjI3MTkzNH0.bslXxvjdt7RN-k0_TQZvfAeDsNmqUhTFcD2HJ0D8_tQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanInvalidFiles() {
  try {
    console.log('🧹 Začínám čištění nevalidních souborů...');

    // Načti všechny zakázky
    const { data: zakazky, error } = await supabase
      .from('zakazky')
      .select('*');

    if (error) {
      throw error;
    }

    console.log(`📊 Načteno ${zakazky.length} zakázek`);

    let updatedCount = 0;

    for (const zakazka of zakazky) {
      let needsUpdate = false;
      let cleanedFiles = [];

      if (zakazka.soubory) {
        if (typeof zakazka.soubory === 'string') {
          // Pokud je prázdný string nebo "[]", nastav na prázdné pole
          if (zakazka.soubory.trim() === '' || zakazka.soubory.trim() === '[]') {
            cleanedFiles = [];
            needsUpdate = true;
          } else {
            try {
              const parsed = JSON.parse(zakazka.soubory);
              if (Array.isArray(parsed)) {
                // Filtruj pouze validní soubory
                const validFiles = parsed.filter(file => 
                  file && 
                  typeof file === 'object' && 
                  file.id && 
                  file.name && 
                  file.name.trim() !== ''
                );
                
                if (validFiles.length !== parsed.length) {
                  needsUpdate = true;
                  cleanedFiles = validFiles;
                  console.log(`⚠️  Zakázka ${zakazka.id}: odstraněno ${parsed.length - validFiles.length} nevalidních souborů`);
                } else {
                  cleanedFiles = validFiles;
                }
              } else {
                needsUpdate = true;
                cleanedFiles = [];
                console.log(`⚠️  Zakázka ${zakazka.id}: nevalidní soubory (není pole)`);
              }
            } catch (e) {
              needsUpdate = true;
              cleanedFiles = [];
              console.log(`⚠️  Zakázka ${zakazka.id}: chyba při parsování souborů`);
            }
          }
        } else if (Array.isArray(zakazka.soubory)) {
          // Filtruj i přímo pole
          const validFiles = zakazka.soubory.filter(file => 
            file && 
            typeof file === 'object' && 
            file.id && 
            file.name && 
            file.name.trim() !== ''
          );
          
          if (validFiles.length !== zakazka.soubory.length) {
            needsUpdate = true;
            cleanedFiles = validFiles;
            console.log(`⚠️  Zakázka ${zakazka.id}: odstraněno ${zakazka.soubory.length - validFiles.length} nevalidních souborů`);
          }
        } else {
          // Pokud není string ani pole, nastav na prázdné pole
          needsUpdate = true;
          cleanedFiles = [];
          console.log(`⚠️  Zakázka ${zakazka.id}: nevalidní typ souborů`);
        }
      }

      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('zakazky')
          .update({ 
            soubory: cleanedFiles,
            updated_at: new Date().toISOString()
          })
          .eq('id', zakazka.id);

        if (updateError) {
          console.error(`❌ Chyba při aktualizaci zakázky ${zakazka.id}:`, updateError);
        } else {
          updatedCount++;
          console.log(`✅ Zakázka ${zakazka.id}: soubory vyčištěny (${cleanedFiles.length} validních souborů)`);
        }
      }
    }

    console.log(`🎉 Vyčištění dokončeno! Aktualizováno ${updatedCount} zakázek.`);

  } catch (error) {
    console.error('❌ Chyba při čištění souborů:', error);
  }
}

// Spusť čištění
cleanInvalidFiles();
