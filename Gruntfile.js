module.exports = function(grunt) {

    // Load all grunt modules
    require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

    // Tell our Express server that Grunt launched it
    process.env.GRUNTED = true;

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        settings: grunt.file.readJSON('./server_config/settings.json'),
        
        font: {
            icons: {
                src: ['front/src/fonts/svg-icons/*.svg'],
                destCss: 'front/src/less/icons.less',
                destFonts: 'front/src/fonts/icons.woff',

                // Optional: Custom routing of font filepaths for CSS
                cssRouter: function (fontpath) {
                    var pathArray = fontpath.split('/');
                    var fileName = pathArray[pathArray.length - 1];
                    return '/fonts/' + fileName;
                }
            }
        },
        less: {
            all: {
                files: [
                    {
                        expand: true,
                        cwd: 'front/src/less/',
                        src: ['**/*.less'],
                        dest: 'front/src/css/',
                        ext: '.css'
                    }
                ]
            }
        },
        replace: {
            dist: {
                options: {
                    patterns: [
                        {
                            match: 'googleAnalyticsId',
                            replacement: '<%= settings.googleAnalyticsId %>'
                        },
                        {
                            match: 'version',
                            replacement: 'v<%= pkg.version %>'
                        }
                    ]
                },
                files: [
                    {expand: true, flatten: true, src: ['front/src/main.html'], dest: 'front/build/'}
                ]
            }
        },
        jshint: {
            all: [
                '*.js',
                'app/lib/*.js',
                'bin/*.js',
                'lib/**/*.js',
                'app/nodeControllers/*.js',
                'app/public/scripts/*.js',
                'phantomas_custom/**/*.js',
                'test/**/*.js',
                'front/src/js/**/*.js'
            ]
        },
        clean: {
            tmp: {
                src: ['.tmp']
            },
            dev: {
                src: ['front/src/css']
            },
            coverage: {
                src: ['.tmp', 'coverage/']
            },
            build: {
                src: ['front/build']
            }
        },
        copy: {
            beforeCoverage: {
                files: [
                    {src: ['bin/server.js'], dest: '.tmp/'}
                ]
            },
            coverage: {
                files: [
                    {src: ['test/**'], dest: 'coverage/'},
                    {src: ['lib/metadata/**'], dest: 'coverage/'},
                    {src: ['node_modules/phantomas/**'], dest: 'coverage/'},
                    {src: ['lib/tools/phantomas/custom_modules/**'], dest: 'coverage/'}
                ]
            },
            build: {
                files: [
                    {src: ['./front/src/fonts/icons.woff'], dest: './front/build/fonts/icons.woff'},
                    {src: ['./front/src/img/favicon.png'], dest: './front/build/img/favicon.png'},
                    {src: ['./front/src/img/logo-large.png'], dest: './front/build/img/logo-large.png'},
                ]
            }
        },
        lineremover: {
            beforeCoverage: {
                files: {
                    '.tmp/bin/cli.js': 'bin/cli.js'
                },
                options: {
                    exclusionPattern: /#!\/usr\/bin\/env node/
                }
            }
        },
        blanket: {
            coverageApp: {
                src: ['app/'],
                dest: 'coverage/app/'
            },
            coverageLib: {
                src: ['lib/'],
                dest: 'coverage/lib/'
            },
            coverageBin: {
                src: ['.tmp/bin/'],
                dest: 'coverage/bin/'
            }
        },
        mochaTest: {
            test: {
                options: {
                    reporter: 'spec',
                },
                src: ['coverage/test/core/*.js', 'coverage/test/api/*.js']
            },
            'test-current-work': {
                options: {
                    reporter: 'spec',
                },
                src: ['test/core/offendersHelpersTest.js']
            },
            coverage: {
                options: {
                    reporter: 'html-cov',
                    quiet: true,
                    captureFile: 'coverage/coverage.html'
                },
                src: ['coverage/test/core/*.js', 'coverage/test/api/*.js']
            }
        },
        env: {
            dev: {
                NODE_ENV: 'development'
            },
            builded: {
                NODE_ENV: 'production'
            }
        },
        express: {
            dev: {
                options: {
                    port: 8383,
                    server: './bin/server.js',
                    serverreload: true,
                    showStack: true
                }
            },
            builded: {
                options: {
                    port: 8383,
                    server: './bin/server.js',
                    serverreload: true,
                    showStack: true
                }
            },
            test: {
                options: {
                    port: 8387,
                    server: './coverage/bin/server.js',
                    showStack: true
                }
            },
            'test-current-work': {
                options: {
                    port: 8387,
                    server: './bin/server.js',
                    showStack: true
                }
            },
            testSuite: {
                options: {
                    port: 8388,
                    bases: 'test/www'
                }
            }
        },
        useminPrepare: {
            html: './front/src/main.html',
            options: {
                dest: './front/build',
                root: ['./', './front/src']
            }
        },
        usemin: {
            html: './front/build/main.html',
            css: './front/build/css/*.css',
            options: {
                assetsDirs: ['front/build'],
                patterns: {
                    css: [[/(\/fonts\/icons\.woff)/gm, 'Replacing reference to icons.woff']]
                }
            }
        },
        htmlmin: {
            options: {
                removeComments: true,
                collapseWhitespace: true
            },
            main: {
                files: [{
                    expand: true,
                    cwd: './front/build/',
                    src: 'main.html',
                    flatten: true,
                    dest: './front/build'
                }]
            },
            views: {
                files: [{
                    expand: true,
                    cwd: './front/src/views',
                    src: '*.html',
                    flatten: true,
                    dest: '.tmp/views/'
                }]
            }
        },
        inline_angular_templates: {
            build: {
                options: {
                    base: '.tmp',
                    method: 'append'
                },
                files: {
                    './front/build/main.html': ['.tmp/views/*.html']
                }
            }
        },
        filerev: {
            options: {
                algorithm: 'md5',
                length: 8
            },
            assets: {
                src: './front/build/*/*.*'
            }
        }
    });


    // Custom task: copies the test settings.json file to the coverage folder, and checks if there's no missing fields
    grunt.registerTask('copy-test-server-settings', function() {
        var mainSettingsFile = './server_config/settings.json';
        var testSettingsFile = './test/fixtures/settings.json';

        var mainSettings = grunt.file.readJSON(mainSettingsFile);
        var testSettings = grunt.file.readJSON(testSettingsFile);

        // Recursively compare keys of two objects (not the values)
        function compareKeys(original, copy, context) {
            for (var key in original) {
                if (!copy[key] && copy[key] !== '' && copy[key] !== 0) {
                    grunt.fail.warn('Settings file ' + testSettingsFile + ' doesn\'t contain key ' + context + '.' + key);
                }
                if (original[key] !== null && typeof original[key] === 'object') {
                    compareKeys(original[key], copy[key], context + '.' + key);
                }
            }
        }

        compareKeys(mainSettings, testSettings, 'settings');

        var outputFile = './coverage/server_config/settings.json';
        grunt.file.write(outputFile, JSON.stringify(testSettings, null, 4));
        grunt.log.ok('File ' + outputFile + ' created');
    });


    grunt.registerTask('icons', [
        'font:icons',
        'less',
        'clean:tmp'
    ]);

    grunt.registerTask('build', [
        'jshint',
        'clean:build',
        'copy:build',
        'less',
        'useminPrepare',
        'concat',
        'uglify',
        'cssmin',
        'replace',
        'htmlmin:views',
        'inline_angular_templates',
        'filerev',
        'usemin',
        'htmlmin:main',
        'clean:tmp'
    ]);

    grunt.registerTask('hint', [
        'jshint'
    ]);

    grunt.registerTask('dev', [
        'env:dev',
        'express:dev'
    ]);

    grunt.registerTask('builded', [
        'env:builded',
        'express:builded'
    ]);

    grunt.registerTask('test', [
        'build',
        'jshint',
        'express:testSuite',
        'clean:coverage',
        'copy-test-server-settings',
        'lineremover:beforeCoverage',
        'copy:beforeCoverage',
        'blanket',
        'copy:coverage',
        'express:test',
        'mochaTest:test',
        'mochaTest:coverage',
        'clean:tmp'
    ]);

    grunt.registerTask('test-current-work', [
        'jshint',
        'express:testSuite',
        'clean:coverage',
        'copy-test-server-settings',
        'express:test-current-work',
        'mochaTest:test-current-work',
        'clean:tmp'
    ]);

};