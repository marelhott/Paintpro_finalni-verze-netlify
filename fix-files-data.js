
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lseqrqmtjymukewnejdd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZXFycW10anltdWtld25lamRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjQ2MjcsImV4cCI6MjA2Nzg0MDYyN30.SgWjc-GETZ_D0tJNtErxXhUaH6z_MgRJtxc94RsUXPw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixFilesData() {
  try {
    console.log('🔧 Opravuji data souborů...');
    
    // Načti všechny zakázky
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, soubory');
    
    if (error) {
      console.error('❌ Chyba při načítání zakázek:', error);
      return;
    }
    
    console.log('📋 Načteno', orders.length, 'zakázek');
    
    let fixedCount = 0;
    
    for (const order of orders) {
      let needsUpdate = false;
      let newSoubory = order.soubory;
      
      // Pokud jsou soubory string "[]", nastav na prázdné pole
      if (typeof order.soubory === 'string') {
        if (order.soubory.trim() === '[]' || order.soubory.trim() === '') {
          newSoubory = [];
          needsUpdate = true;
          console.log('🔧 Opravuji prázdné soubory pro zakázku', order.id);
        } else {
          // Pokusit se parsovat a zkontrolovat validitu
          try {
            const parsed = JSON.parse(order.soubory);
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
                newSoubory = validFiles;
                needsUpdate = true;
                console.log('🔧 Filtruju nevalidní soubory pro zakázku', order.id, '- původně:', parsed.length, 'nově:', validFiles.length);
              }
            }
          } catch (parseError) {
            // Pokud nejde parsovat, nastav prázdné pole
            newSoubory = [];
            needsUpdate = true;
            console.log('🔧 Opravuji neparsovatelné soubory pro zakázku', order.id);
          }
        }
      } else if (Array.isArray(order.soubory)) {
        // Zkontroluj validitu i u pole
        const validFiles = order.soubory.filter(file => 
          file && 
          typeof file === 'object' && 
          file.id && 
          file.name && 
          file.name.trim() !== ''
        );
        
        if (validFiles.length !== order.soubory.length) {
          newSoubory = validFiles;
          needsUpdate = true;
          console.log('🔧 Filtruju nevalidní soubory z pole pro zakázku', order.id, '- původně:', order.soubory.length, 'nově:', validFiles.length);
        }
      }
      
      // Aktualizuj pokud je potřeba
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('orders')
          .update({ soubory: newSoubory })
          .eq('id', order.id);
        
        if (updateError) {
          console.error('❌ Chyba při aktualizaci zakázky', order.id, ':', updateError);
        } else {
          fixedCount++;
          console.log('✅ Opravena zakázka', order.id);
        }
      }
    }
    
    console.log('✅ Dokončeno! Opraveno', fixedCount, 'zakázek');
    
  } catch (error) {
    console.error('❌ Kritická chyba:', error);
  }
}

fixFilesData();
