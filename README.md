Milkyway Multimedia Buildr
===============================================
Make sure you have node.js, bower, gulp and composer
installed in order to update/deploy this project (on a mac you can
use homebrew to install most of these: http://brew.sh/, once node.js
is installed, you can use npm to install gulp: http://gulpjs.com/)

## Features
- [x] Compose LESS and SCSS to css
- [x] Lint JS and check if they are valid for you
- [x] Minimise CSS, JS, Images, HTML and SVG
- [x] Copy files from one directory to another
- [x] Create SVG sprites to use as icons or other uses
- [x] Serve jekyll files and configuration, for static sites
- [x] Execute gulp in sub-directories that include a assets.json file
- [x] An automatic syncing browser, allowing you to view websites on the same lan network (for developing on mobile)
- [x] Git deployment
- [x] Deployment via rsync, with backups if required (should always be required)
- [x] Automatically watches your files for you
- [x] Can install bower.json, package.json and composer.json dependencies automatically
- [x] All completely optional, configured via the easy to use assets.json file

## Install
This is an in-house plugin, you can only install if you have SSH access
to the bitbucket repository.

If you want to use to allow another person to use this plugin, but do not
want them to have access to edit the file, add their SSH details as a deployment
key (https://bitbucket.org/milkyway-multimedia/mwm-buildr/admin/deploy-keys).

Simply install by using:

```
npm install 'gulp' -g
npm install 'gulp' --save-dev
npm install 'git+ssh://git@bitbucket.org:milkyway-multimedia/mwm.buildr.git' --save-dev
```

Or add it to your **devDependencies** property in your package.json file. *It is also important
that you have Gulp as a dependency as well*.

Once installed, either copy the gulpfile.example.js to your project directory and rename it
to gulpfile.js, or copy the following code into a gulpfile.js file in your project directory.

```
var gulp = require('gulp');
require('mwm.buildr')(gulp);
```

You can add additional tasks to your gulpfile.js, and you also now have access to the standard mwm-buildr tasks (yay!)

The mwm-buildr uses **assets.json** as its configuration file, and must live in your project directory.
This is where you set what you need the module to build, and how to deploy and backup (please see below for
more details on how to use it in the **assets.json** section).

You can copy the assets.json file that comes with the module as an example.

## Important tasks

The tasks you will most likely use are:

1. **gulp watch** Watch files and build the assets as necessary (ie. EVERYTHING except deploying). This does all the
building, and will boot up an automatically refreshing browser for you as well. This is the default task. I suggest to
always use this while working on the project.
2. **gulp build** Build all assets and files
3. **gulp deploy** Deploy files using your deployment configuration in assets.json
4. **gulp targets:backup** Backup targets (you won't need this if the project is set to git deploy only)

## assets.json

A typical assets.json file look like the one included with the module. I will go through each property you can edit here.

### server
This is the options for browser-sync (Check here for available options: http://www.browsersync.io/docs/options/).

Some common ones I use are:

#### proxy 
Proxy browser-sync to use a vagrant hosted/test server website (when your application uses PHP or Ruby, this is most likely required). The following example will assume the site is reachable at http://milkywaymultimedia.dev.

```
{
   "server": {
      "proxy": "http://milkywaymultimedia.dev"
   }
}
```

#### server 
For a static/jekyll website, I use the server option (this will make browser-sync serve a folder as a website). The following example will assume your build project is in the public/ directory.

```
{
  "server": {
     "server": {
       "baseDir": "public"
     }
  }
}
```

### deploy
These are the deploy settings for each deployment task (currently targets - remote sync and git is available). These settings are exactly the same format as the settings for git and targets respectively

### git
You can specify what branch(es) to push/pull from (the first in the array is the default). The full set of settings for each branch is:

```
{
  "git": [
     {
       "branch": "develop",
       "origin": "origin",
       "args": [
           "--log"
       ]
     }
  ]
}
```

### targets
You can specify what targets to push to, additionally it will accept all remote sync settings. There are also some advanced settings. You should have an SSH key for your server stored on the computer doing the target:push or target:deploy.

- **src** The source folder to upload (if not defined, will use the project directory)
- **dest** Folder at destination
- **host** This is the host you want the project uploaded to (not required if locally)
- **username** Username on host server (not required if locally)
- **src-commands-before** Commands to do on source directory before syncing
- **dest-commands-before** Commands to do on destination before syncing
- **src-commands-after** Commands to do on source directory after syncing is complete
- **dest-commands-after** Commands to do on destination after syncing is complete
- **push-backups** Backup settings for whenever a push is made (also accepts rsync settings)
- **pull-backups** Backup settings for whenever a pull is made (also accepts rsync settings)
- **deploy-backups** Backup settings for whenever a deploy is made (also accepts rsync settings, by default will use push-backup settings)

```
{
  "targets": {
      "production": [
        {
          "dest": "/yourwebsite.com.au",
          "host": "111.111.111.11",
          "username": "mwm",
          // You can insert any rsync arguments here, like perms: true
          "src-commands-before": [
            "composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction"
          ],
          "dest-commands-after": [
            "cd {$PWD}",
            "composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction",
            "find . -name _assets -type d -exec rm -rf {} \\;"
          ],
          "src-commands-after": [
            "cd {$SRC}",
            "composer install --dev --optimize-autoloader --no-interaction"
          ],
          "push-backups": [
            {
              "dest": "{$HOME}/.push-backups/{$PROJECT}",
              "itemize-changes": true
            },
            {
              "dest": "{$HOME}/.push-backups/archives/{$DATE}-{$PROJECT}",
              "save-as-archive": true
            }
          ],
          "pull-backups": [
            {
              "dest": "{$HOME}/.pull-backups/{$PROJECT}",
              "itemize-changes": true
            }
          ]
        }
      ]
    }
  }
}
```

### css, js, images, copy, sprites
This is how the module knows what assets to build and such. They have similar settings, I will go into each asset's advanced configuration in their respective sections. They all accept either an array of different settings, or an object if you only need one.

- **src** This is the glob for the source files (can be an array of globs)
- **dest** This is the final destination where the built files will sit. If it ends in .css, it will automatically assume to merge all the files in src to that file.
- **watch** This is the files to watch when a watcher is created for this asset, by default it will use src

#### css
- **dest** As above but if it ends in .css, it will automatically assume to merge all the files in src to that file.
```
  {
    "css": [
      {
        "src": [
          "_assets/css/**/*",
          "!_assets/css/_*",
          "!_assets/css/_*/**/*"
        ],
        "watch": [
          "_assets/css/**/*"
        ],
        "dest": "public/css/"
      }
    ]
  }
```

#### js
- **dest** As above but if it ends in .js, it will automatically assume to merge all the files in src to that file.
- **lint** A glob for selecting which files to lint. If not defined, will use the src glob.

```
  {
    "js": {
      "src": [
        "_assets/js/**/*",
        "!_assets/js/_*",
        "!_assets/js/_*/**/*"
      ],
      "watch": [
        "_assets/js/**/*"
      ],
      "dest": "public/js/"
    }
  }
```

#### copy

```
  {
    "copy": {
      "src": [
        "_assets/fonts/**/*",
        "!_assets/fonts/_*",
        "!_assets/fonts/_*/**/*"
      ],
      "watch": [
        "_assets/fonts/**/*"
      ],
      "dest": "public/fonts/"
    }
  }
```

#### sprites
- **config** This is the configuration to be used by the svg-sprite plugin, please see the https://github.com/jkphl/svg-sprite for configuration.

```
{
  "sprites": [
      {
        "src": [
          "bower_components/open-iconic/svg/**/*.svg",
          "_assets/images/icons/**/*.svg"
        ],
        "dest": "app/icons/",
        "config": {
          "mode": {
            "symbol": {
              "prefix": ".mwm-icon-%s",
              "sprite": "mwm-icons.svg"
            }
          }
        }
      }
    ]
}
```

### refresh
This is a simple glob or array of globs that will sync and reload the browser page whenever they are changed.

```
{
  "refresh": [
    "**/*.html"
  ]
}
```

### jekyll
If you are using jekyll in your project, you can set up settings here. You can only set src and dest here, everything else (and these values actually) are recommended to be set in your jekyll configuration file (usually _config.yml).

To save double handling, I recommend 

```
{
  "jekyll": {
  
  }
}
```