const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const migrationPath = path.join(__dirname, '../prisma/migrations/0_init/migration.sql');

const schema = fs.readFileSync(schemaPath, 'utf-8');

// 先重新生成干净的 migration
const { execSync } = require('child_process');
execSync('npx prisma migrate diff --from-empty --to-schema-datamodel ./prisma/schema.prisma --script > ./prisma/migrations/0_init/migration.sql 2>/dev/null', {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf-8'
});

let migration = fs.readFileSync(migrationPath, 'utf-8');

// 解析 schema 获取表和字段的注释
const models = {};
let currentModel = null;
let currentComment = null;

for (const line of schema.split('\n')) {
  const trimmed = line.trim();

  // 获取注释
  if (trimmed.startsWith('///')) {
    currentComment = trimmed.replace('///', '').trim();
    continue;
  }

  // 获取模型名
  const modelMatch = trimmed.match(/^model\s+(\w+)\s*\{/);
  if (modelMatch) {
    currentModel = modelMatch[1];
    // 转换为 snake_case 表名
    const tableName = currentModel.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    models[tableName] = { comment: currentComment, fields: {} };
    currentComment = null;
    continue;
  }

  // 获取字段 (排除关系字段)
  if (currentModel && trimmed && !trimmed.startsWith('@@') && !trimmed.startsWith('}')) {
    const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)/);
    if (fieldMatch && currentComment) {
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2];
      // 跳过关系字段 (类型是其他模型名)
      if (fieldType[0] === fieldType[0].toUpperCase() && fieldType !== 'String' && fieldType !== 'Int' && fieldType !== 'Boolean' && fieldType !== 'DateTime' && fieldType !== 'Json' && fieldType !== 'Float' && fieldType !== 'Decimal' && fieldType !== 'BigInt' && fieldType !== 'Bytes') {
        currentComment = null;
        continue;
      }
      // 转换为 snake_case
      const snakeName = fieldName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
      const tableName = currentModel.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
      // 转义单引号
      models[tableName].fields[snakeName] = currentComment.replace(/'/g, "''");
    }
    currentComment = null;
  }

  // 模型结束
  if (trimmed === '}') {
    currentModel = null;
  }
}

console.log('Found', Object.keys(models).length, 'models');

// 处理每个表
const lines = migration.split('\n');
const result = [];
let inTable = false;
let currentTableName = null;

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];

  // 检测表开始
  const tableMatch = line.match(/^CREATE TABLE `(\w+)` \(/);
  if (tableMatch) {
    inTable = true;
    currentTableName = tableMatch[1];
    result.push(line);
    continue;
  }

  // 检测表结束
  if (inTable && line.includes(') DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;')) {
    // 添加表注释
    const tableInfo = models[currentTableName];
    if (tableInfo && tableInfo.comment) {
      const escapedComment = tableInfo.comment.replace(/'/g, "''");
      line = line.replace(
        ') DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;',
        `) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='${escapedComment}';`
      );
    }
    result.push(line);
    inTable = false;
    currentTableName = null;
    continue;
  }

  // 处理字段行 (在表内，且不是 INDEX 行)
  if (inTable && currentTableName && !line.includes('INDEX') && !line.includes('PRIMARY KEY')) {
    const fieldMatch = line.match(/^\s+`(\w+)`/);
    if (fieldMatch) {
      const fieldName = fieldMatch[1];
      const tableInfo = models[currentTableName];
      if (tableInfo && tableInfo.fields[fieldName] && !line.includes('COMMENT')) {
        // 在行尾逗号前添加 COMMENT
        const comment = tableInfo.fields[fieldName];
        if (line.endsWith(',')) {
          line = line.slice(0, -1) + ` COMMENT '${comment}',`;
        } else {
          line = line + ` COMMENT '${comment}'`;
        }
      }
    }
  }

  result.push(line);
}

fs.writeFileSync(migrationPath, result.join('\n'));
console.log('Migration file updated with comments');
