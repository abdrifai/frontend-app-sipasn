module.exports = {
    apps: [
        {
            name: "frontend-sipasn",
            script: "./build/index.js",
            cwd: "/var/www/frontend-app-sipasn",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",

            // Sisakan hanya mode environment PM2
            env: {
                NODE_ENV: "production",
                PORT: 3001,
                BODY_SIZE_LIMIT: "Infinity"
            }
        }
    ]
};