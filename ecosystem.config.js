module.exports = {
  apps: [
    {
      name: 'FD',
      append_env_to_name: true,
      script: 'npm',
      args: 'run start',
      instances: 0,
      autorestart: true,
      xp_backoff_restart_delay: 100,
      watch: false,
      max_memory_restart: '1G',
      wait_ready: true,
      listen_timeout: 10000,
      env_production: {
        PORT: 3000,
        NODE_ENV: 'production',
        IZNIK_API: 'https://fdapilive.ilovefreegle.org',
        CDN: 'https://freeglecdn.azureedge.net'
      },
      env_development: {
        PORT: 3001,
        NODE_ENV: 'production',
        IZNIK_API: 'https://fdapidev.ilovefreegle.org',
        CDN: 'https://freeglecdndev.azureedge.net'
      },
      env_debug: {
        PORT: 3002,
        NODE_ENV: 'development',
        IZNIK_API: 'https://fdapidbg.ilovefreegle.org',
        CDN: 'https://freeglecdndbg.azureedge.net'
      }
    }
  ],

  deploy: {
    // The live site.
    production: {
      user: 'root',
      key: '/root/.ssh/id_rsa',
      host: ['46.43.9.246', '5.28.62.22'],
      ref: 'origin/master',
      repo: 'git@github.com:Freegle/iznik-nuxt.git',
      path: '/var/www/fdnuxt.live',
      'post-deploy':
        'monit stop nginx && rsync -a app4:/var/build/iznik-nuxt/ . && npx patch-package && cp restartfd /etc && chmod +x /etc/restartfd && cp waitfornode /etc && chmod +x /etc/waitfornode && pm2 restart FD-production --update-env && /etc/waitfornode && monit start nginx'
    },
    // The preview site which is used by volunteers for testing.  We're sticking with this name because it's firmly
    // ingrained into volunteers' heads.
    development: {
      user: 'root',
      key: '/root/.ssh/id_rsa',
      host: ['46.43.9.246', '5.28.62.22'],
      ref: 'origin/master',
      repo: 'git@github.com:Freegle/iznik-nuxt.git',
      path: '/var/www/fdnuxt.dev',
      'post-deploy':
        'rsync -a app4:/var/build/iznik-nuxt/ . && npx patch-package && cp restartfd /etc && chmod +x /etc/restartfd && cp waitfornode /etc && chmod +x /etc/waitfornode && pm2 restart FD-development --update-env && /etc/waitfornode'
    },
    // The site which (despite the name) which is used by developers.
    debug: {
      user: 'root',
      key: '/root/.ssh/id_rsa',
      host: ['46.43.9.246', '5.28.62.22'],
      ref: 'origin/master',
      repo: 'git@github.com:Freegle/iznik-nuxt.git',
      path: '/var/www/fdnuxt.dbg',
      'post-deploy':
        'rsync -a app4:/var/build/iznik-nuxt/ . && npx patch-package && cp restartfd /etc && chmod +x /etc/restartfd && cp waitfornode /etc && chmod +x /etc/waitfornode && pm2 restart FD-debug --update-env && /etc/waitfornode'
    }
  }
}
