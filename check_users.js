const { query } = require('./config/database');

async function checkUsers() {
  try {
    const users = await query('SELECT * FROM users');
    console.log('Users in database:', users);
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUsers();
