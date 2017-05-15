module.exports = {
    // TOKEN OF DISCORD APPLICATION
    TOKEN: '',
    // SERVER ID
    SERVER_ID: '',
    // CHANNEL FOR WELCOME MESSAGES
    DEFAULT_CH: '',
    // CHANNEL FOR DEBUG/INFO MESSAGES
    BOT_CH: '',
    // CLIENT ID OF ADMIN USER
    BOT_ADMIN: '',
    // PATH TO RADIO START SCRIPT
    RADIO_START: '',
    // CLIENT ID OF RADIO BOT
    RADIO_BOT: '',
    // YOUTUBE API KEY
    YOUTUBE_KEY: '',
    // BASE URL FOR SPOILER/LEADERBOARD/ETC (W/O SLASH)
    BASE_URL: '',
    // TWITTER API KEY
    TWITTER_API: {
        CONSUMER_KEY: '',
        CONSUMER_SECRET: '',
        ACCESS_TOKEN_KEY: '',
        ACCESS_TOKEN_SECRET: ''
    },
    // MYSQL SERVER CREDENTIALS
    // DATABASE SETUP:
    // CREATE TABLE `daily` (`DATE` date NOT NULL,`MESSAGES` int(11) NOT NULL,`COMMANDS` int(11) NOT NULL,PRIMARY KEY (`DATE`)) ENGINE=InnoDB DEFAULT CHARSET=utf8
    MYSQL_SERVER: {
        HOSTNAME: '',
        PORT: '',
        USERNAME: '',
        PASSWORD: '',
        DATABASE: ''
    },
    // SEND MORE DEBUG MESSAGES
    DEBUG: false
};