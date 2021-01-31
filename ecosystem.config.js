module.exports = {
  apps: [
    {
      name: "noze",
      script: "src/index.js",
      instances: 1,
      autorestart: true,
      max_memory_restart: "1000M",
      watch: false,
      time: true
    }
  ]
};
