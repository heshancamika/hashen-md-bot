const Sequelize = require('sequelize');

class DatabaseManager {
    static instance = null;

    static getInstance() {
        if (!DatabaseManager.instance) {
            const DATABASE_URL = process.env.DATABASE_URL || './database.db';

            DatabaseManager.instance =
                DATABASE_URL === './database.db'
                    ? new Sequelize({
                            dialect: 'sqlite',
                            storage: DATABASE_URL,
                            logging: false,
                            pool: {
                                max: 5,
                                min: 0,
                                acquire: 30000,
                                idle: 10000
                            },
                            define: {
                                timestamps: false,
                                freezeTableName: true
                            }
                      })
                    : new Sequelize(DATABASE_URL, {
                            dialect: 'postgres',
                            ssl: true,
                            protocol: 'postgres',
                            dialectOptions: {
                                native: true,
                                ssl: { require: true, rejectUnauthorized: false },
                            },
                            logging: false,
                            pool: {
                                max: 5,
                                min: 0,
                                acquire: 30000,
                                idle: 10000
                            },
                            define: {
                                timestamps: false,
                                freezeTableName: true
                            }
                      });
        }
        return DatabaseManager.instance;
    }
}

const DATABASE = DatabaseManager.getInstance();

// Optimize database sync with better error handling
DATABASE.sync({ alter: false, force: false })
    .then(() => {
        console.log('Database synchronized successfully.');
    })
    .catch((error) => {
        console.error('Error synchronizing the database:', error);
    });

module.exports = { DATABASE };

// jawadtechx