let TwitterClient = require('twitter-node-client').Twitter,
    Discord = require('discord.js'),
    async = require('async');

function Twitter(config, bot) {
    this.bot = bot;
    this.profiles = require('../config/twitter');
    this.init = false;
    this.lastTweets = {};

    const tw_config = {
        'consumerKey': config.CONSUMER_KEY,
        'consumerSecret': config.CONSUMER_SECRET,
        'accessToken': config.ACCESS_TOKEN_KEY,
        'accessTokenSecret': config.ACCESS_TOKEN_SECRET
    };

    this.client = new TwitterClient(tw_config);

    this.initTwitter();
}

Twitter.prototype.initTwitter = function () {
    const parent = this;

    async.each(this.profiles, (profile, callback) => {
        parent.client.getUserTimeline({screen_name: profile.name, count: '1'}, (err) => {
            parent.bot.log('Could not initialize twitter for ' + profile.name + "! " + err);
        }, function (data) {
            let jsonData;
            try {
                jsonData = JSON.parse(data);
            } catch (err) {
                parent.bot.log(err);
                return callback();
            }

            if (jsonData.length < 1) {
                parent.bot.log('Could not initialize twitter for ' + profile.name + ', no tweets fetched...');
            } else {
                parent.lastTweets[profile.name] = jsonData[0].id_str;
            }

            callback();
        })
    }, function () {
        parent.init = true;
    });
};

Twitter.prototype.postNewTweets = function () {
    const parent = this;

    if (!this.init) {
        return;
    }

    async.each(parent.profiles, (profile, callback) => {
        if (!(profile.name in parent.lastTweets)) {
            return callback();
        }

        const options = {
            screen_name: profile.name,
            count: '10',
            since_id: parent.lastTweets[profile.name],
            include_rts: profile.rts,
            exclude_replies: !profile.mentions
        };

        parent.client.getUserTimeline(options, (err) => {
            parent.bot.log('Could not fetch new tweets for' + profile.name + "! " + err);
        }, function (data) {
            let jsonData;

            try {
                jsonData = JSON.parse(data);
            } catch (err) {
                parent.bot.log('Could not fetch new tweets for' + profile.name + '! ' + err);
                return callback();
            }

            if (jsonData.length >= 1) {
                parent.lastTweets[profile.name] = jsonData[0].id_str;

                if (!parent.bot.server.channels.has(profile.channel)) {
                    parent.bot.log('Could not find channel id ' + profile.channel + ' for ' + profile.name);
                    return callback();
                }

                const channel = parent.bot.server.channels.get(profile.channel);

                async.each(jsonData, function (tweet, callback) {
                    const embed = parent.getEmbedByTweet(tweet);
                    channel.send({embed});
                    callback();
                });
            }

            callback();
        });
    });
};

Twitter.prototype.getTestTweet = function(user) {
    const parent = this;

    let rts = true;
    let mentions = false;

    const options = {
        screen_name: user,
        count: '1',
        include_rts: rts,
        exclude_replies: !mentions
    };

    parent.client.getUserTimeline(options, (err)  =>{
        parent.bot.log('Could not fetch new tweets for' + profile.name + "! " + err);
    }, function (data) {
        let jsonData;

        try {
            jsonData = JSON.parse(data);
        } catch (err) {
            parent.bot.log('Could not fetch new tweets for' + profile.name + '! ' + err);
        }


        parent.bot.log(data);

        if (jsonData.length >= 1) {

            async.each(jsonData, (tweet, callback) => {
                const embed = parent.getEmbedByTweet(tweet);
                parent.bot.log(embed);
                parent.bot.server.channels.get(require('../config/config').BOT_CH).send({embed});
                callback();
            });
        }
    });
};

Twitter.prototype.getEmbedByTweet = function (tweet) {
    let embed = new Discord.RichEmbed({
        author: {
            name: `Neuer Tweet von @${tweet.user.screen_name} (${tweet.user.name})`,
            icon_url: tweet.user.profile_image_url_https,
            url: `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`
        },
        color: 0x1B98D1,
        thumbnail: {
            url: tweet.user.profile_image_url_https
        },
        url: `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`
    });

    if (tweet.entities.urls.length > 0) {
        tweet.entities.urls.map((a) => {
            tweet.text = tweet.text.replace(a.url, `[${a.url}](${a.url})`);
            embed.addField('Link aus Tweet', `[${a.expanded_url}](${a.expanded_url})`);
        });
    }

    let photo = null;
    if ('media' in tweet.entities) {
        if (tweet.entities.media.length > 0) {
            tweet.entities.media.forEach((media) => {
                tweet.text = tweet.text.replace(media.url, `[${media.url}](${media.url})`);

                if (photo != null) return;

                if (media.type == 'photo') {
                    photo = media;
                }
            });
        }
    }

    if (photo != null) {
        embed.setThumbnail(photo.media_url_https);
    }

    embed.setDescription(tweet.text);

    return embed;
};

if (!(typeof exports === 'undefined')) {
    exports.Twitter = Twitter;
}
