
console.log('🧹 === ČIŠTĚNÍ CACHE A QUEUE ===');
console.log('⏰', new Date().toLocaleString('cs-CZ'));
console.log('');

// V Node.js prostředí nemůžeme přímo přistupovat k localStorage,
// ale můžeme vytvořit instrukce pro manuální čištění

console.log('📋 MANUÁLNÍ KROKY PRO VYČIŠTĚNÍ:');
console.log('');
console.log('1. Otevřete Developer Tools v prohlížeči (F12)');
console.log('2. Přejděte na záložku "Application" nebo "Storage"');
console.log('3. V levém menu najděte "Local Storage"');
console.log('4. Klikněte na vaši doménu');
console.log('5. Najděte a smažte tyto klíče:');
console.log('   - paintpro_orders_cache_admin_1');
console.log('   - paintpro_orders_cache_lenka');  
console.log('   - sync_queue');
console.log('   - paintpro_users_cache');
console.log('');
console.log('🔄 ALTERNATIVNĚ - spusťte tento kód v browser console:');
console.log('');
console.log(`
// Kopírujte a vložte do browser console:
localStorage.removeItem('paintpro_orders_cache_admin_1');
localStorage.removeItem('paintpro_orders_cache_lenka');
localStorage.removeItem('sync_queue');
localStorage.removeItem('paintpro_users_cache');
console.log('✅ Cache a queue vyčištěny');
location.reload(); // Restartuje aplikaci
`);

console.log('');
console.log('💡 Po vyčištění:');
console.log('- Aplikace se znovu načte čistá data ze Supabase');
console.log('- Nebudou už žádné konflikty s nevalidními záznamy');
console.log('- Merge logika bude fungovat pouze s validními daty');

console.log('');
console.log('🧹 === INSTRUKCE DOKONČENY ===');
