let Discord = require('discord.js'),
    config = require('./config/config'),
    roles = require('./config/roles'),
    Twitter = require('./modules/twitter').Twitter,
    YouTube = require('./modules/youtube').YouTube,
    Database = require('./modules/database').Database,
    fs = require('fs'),
    unirest = require('unirest'),
    token = config.TOKEN,
    bot = new Discord.Client(),
    exec = require('child_process').exec,
    moment = require('moment'),
    mysql = require('mysql'),
    schedule = require('node-schedule');

moment.locale('de');

bot.radio = config.RADIO_START;

bot.commands = new Discord.Collection();
bot.aliases = new Discord.Collection();
bot.jobs = new Discord.Collection();
bot.events = new Discord.Collection();

bot.config = config;

bot.youtube = new YouTube(bot);

bot.pool = mysql.createPool({
    host: bot.config.MYSQL_SERVER.HOSTNAME,
    port: bot.config.MYSQL_SERVER.PORT,
    user: bot.config.MYSQL_SERVER.USERNAME,
    password: bot.config.MYSQL_SERVER.PASSWORD,
    database: bot.config.MYSQL_SERVER.DATABASE,
    timezone: 'Z'
});

bot.database = new Database(bot);

bot.twitter = new Twitter(config.TWITTER_API, bot);

bot.cooldowns = {};

bot.log = (msg) => {
    console.log(`[${moment().format("YYYY-MM-DD HH:mm:ss")}] ${msg}`);
};

/* COMMAND LOADER */
let commandLoader = function (currentPath) {
    bot.log("Searching for Commands... " + currentPath);
    let files = fs.readdirSync(currentPath);
    for (let i in files) {
        let currentFile = currentPath + '/' + files[i];
        let stats = fs.statSync(currentFile);
        if (stats.isFile()) {
            let loader = require(`${currentFile}`);
            bot.commands.set(loader.help.name.toLowerCase(), loader);
            if ('aliases' in loader.config) {
                loader.config.aliases.forEach(alias => {
                    bot.aliases.set(alias, loader.help.name);
                });
            }
        } else if (stats.isDirectory()) {
            commandLoader(currentFile);
        }
    }
};
commandLoader('./commands');

/* JOB LOADER */
let jobLoader = function (currentPath) {
    bot.log("Searching for Jobs... " + currentPath);
    let files = fs.readdirSync(currentPath);
    for (let i in files) {
        let currentFile = currentPath + '/' + files[i];
        let stats = fs.statSync(currentFile);
        if (stats.isFile()) {
            let loader = require(`${currentFile}`);
            if (loader.config.enabled) {
                let time = loader.config.schedule;
                if ('schedule_dev' in loader.config && bot.config.DEBUG) {
                    time = loader.config.schedule_dev;
                }
                let job = schedule.scheduleJob(time, () => {
                    loader.run(bot);
                });
                loader.job = job;
            }
            bot.jobs.set(loader.config.name.toLowerCase(), loader);
        } else if (stats.isDirectory()) {
            jobLoader(currentFile);
        }
    }
};
jobLoader('./jobs');

/* EVENT LOADER */
let eventLoader = function (currentPath) {
    bot.log("Searching for Events... " + currentPath);
    let files = fs.readdirSync(currentPath);
    for (let i in files) {
        let currentFile = currentPath + '/' + files[i];
        let stats = fs.statSync(currentFile);
        if (stats.isFile()) {
            let loader = require(`${currentFile}`);
            if (loader.config.enabled) {
                loader.Event(bot);
                bot.on(loader.config.name, loader.run);
            }
            bot.events.set(loader.config.name.toLowerCase(), loader);
        } else if (stats.isDirectory()) {
            eventLoader(currentFile);
        }
    }
};
eventLoader('./events');

/* DB SETUP */
let dbSetup = function () {
    bot.log('Setting up database...');
    fs.readFile('./db_setup.sql', 'utf8', (err, data) => {
        if (err) {
            return bot.log('Failed to open setup sql file: ' + err);
        }
        bot.pool.getConnection((error, con) => {
            if (error) {
                return bot.log('Failed to get db connection: ' + error);
            }

            const statements = data.split(';');

            statements.forEach(data => {
                con.query(data, (err, results, fields) => {
                    if (err) {
                        return bot.log('Failed to setup db: ' + err);
                    }
                })
            });
        });
    });
};
dbSetup();

/* VERSION */
bot.getVersion = (callback) => {
    let info = {};

    exec('git rev-parse --short=4 HEAD', function (error, version) {
        if (error) {
            bot.log('Error getting version', error);
            info.version = 'unknown';
        } else {
            info.version = version.trim();
        }

        exec('git log -1 --pretty=%B', function (error, message) {
            if (error) {
                bot.log('Error getting commit message', error);
            } else {
                info.message = message.trim();
            }

            exec('git log -1 --date=short --pretty=format:%ci', function (error, timestamp) {
                if (error) {
                    console.log('Error getting creation time', error);
                } else {
                    info.timestamp = timestamp;
                }

                callback(info);
            });
        });
    });
};

/* BOT METHODS */
bot.checkPermissions = (role, user) => {
    const member = bot.server.members.get(user.id);

    if (bot.server.owner == member && !config.DEBUG) {
        return true;
    }

    if (!bot.server.roles.has(role)) {
        return false;
    }

    return member.highestRole.comparePositionTo(bot.server.roles.get(role)) >= 0;
};

bot.getGuildMember = (user) => {
    return bot.server.members.get(user.id);
};

bot.respond = (message, response, mention, autodel) => {
    if (typeof mention === 'undefined') {
        mention = false;
    }

    if (typeof autodel === 'undefined') {
        autodel = 0;
    }

    function del(msg) {
        if(autodel <= 0) return;
        setTimeout(() => msg.delete(), autodel * 1000);
    }

    if (mention) {
        message.reply(response).then(msg => del(msg));
    } else {
        message.channel.send(response).then(msg => del(msg));
    }
};

bot.respondPm = (message, response) => {
    message.author.send(response);
};

bot.getEmoji = (name) => {
    if (bot.server.emojis.exists('name', name)) {
        return bot.server.emojis.find('name', name).toString();
    } else {
        return ':robot:';
    }
};

bot.randomInt = (low, high) => {
    return Math.floor(Math.random() * (high - low + 1) + low);
};

/* GENERAL APPLICATION STUFF */
process.on('exit', () => {
    bot.idle();
});

process.on('SIGINT', () => {
    bot.idle();
    process.exit();

});

bot.idle = () => {
    bot.user.setStatus('idle');
};

bot.online = () => {
    bot.user.setStatus('online');
};

/* LOGIN */
bot.login(token);
