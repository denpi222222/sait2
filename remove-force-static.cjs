const fs = require('fs');
const path = require('path');

function findFiles(dir, pattern) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findFiles(fullPath, pattern));
    } else if (pattern.test(item)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function removeForceStatic(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    content = content.replace(/export const dynamic = ['"]force-static['"];?\s*/g, '');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Удален force-static из: ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  force-static не найден в: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Ошибка при обработке ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔍 Поиск API роутов...');
  
  const apiDir = path.join(__dirname, 'app', 'api');
  
  if (!fs.existsSync(apiDir)) {
    console.log('❌ Папка app/api не найдена');
    return;
  }
  
  const routeFiles = findFiles(apiDir, /route\.ts$/);
  console.log(`📁 Найдено ${routeFiles.length} API роутов`);
  
  let removedCount = 0;
  
  for (const file of routeFiles) {
    if (removeForceStatic(file)) {
      removedCount++;
    }
  }
  
  console.log(`\n🎉 Завершено! Удалено force-static из ${removedCount} файлов`);
}

main(); 