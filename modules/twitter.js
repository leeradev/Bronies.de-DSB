let TwitterClient = require('twitter-node-client').Twitter,
    Discord = require('discord.js'),
    async = require('async');

function Twitter(config, server) {
    this.server = server;
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

    async.each(this.profiles, function (profile, callback) {
        parent.client.getUserTimeline({screen_name: profile.name, count: '1'}, function (err) {
            console.log('Could not initialize twitter for ' + profile.name + "! " + err);
        }, function (data) {
            let jsonData;
            try {
                jsonData = JSON.parse(data);
            } catch (err) {
                console.log(err);
                return callback();
            }

            if (jsonData.length < 1) {
                console.log('Could not initialize twitter for ' + profile.name + ', no tweets fetched...');
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

    async.each(parent.profiles, function (profile, callback) {
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

        parent.client.getUserTimeline(options, function (err) {
            console.log('Could not fetch new tweets for' + profile.name + "! " + err);
        }, function (data) {
            let jsonData;

            try {
                jsonData = JSON.parse(data);
            } catch (err) {
                console.log('Could not fetch new tweets for' + profile.name + '! ' + err);
                return callback();
            }

            if (jsonData.length >= 1) {
                parent.lastTweets[profile.name] = jsonData[0].id_str;

                if (!parent.server.channels.has(profile.channel)) {
                    console.log('Could not find channel id ' + profile.channel + ' for ' + profile.name);
                    return callback();
                }

                const channel = parent.server.channels.get(profile.channel);

                async.each(jsonData, function (tweet, callback) {
                    channel.sendEmbed(parent.getEmbedByTweet(tweet));
                    callback();
                });
            }

            callback();
        });
    });
};

Twitter.prototype.getTestTweet = function (user) {
    const parent = this;

    let rts = true;
    let mentions = false;

    const options = {
        screen_name: user,
        count: '1',
        include_rts: rts,
        exclude_replies: !mentions
    };

    parent.client.getUserTimeline(options, function (err) {
        console.log('Could not fetch new tweets for' + profile.name + "! " + err);
    }, function (data) {
        let jsonData;

        try {
            jsonData = JSON.parse(data);
        } catch (err) {
            console.log('Could not fetch new tweets for' + profile.name + '! ' + err);
        }


        console.log(data);

        if (jsonData.length >= 1) {

            async.each(jsonData, function (tweet, callback) {
                console.log(parent.getEmbedByTweet(tweet));
                callback();
            });
        }
    });
};

Twitter.prototype.getEmbedByTweet = function(tweet) {
    let embed = new Discord.RichEmbed({
        title: `Neuer Tweet von @${tweet.user.screen_name} (${tweet.user.name})`,
        color: 0x2084EE,
        description: tweet.text,
        thumbnail: {
            url: tweet.user.profile_image_url_https
        },
        url: `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`
    });

    if (tweet.entities.urls.length > 0) {
        tweet.entities.urls.map(function (a) {
            embed.addField('Link aus Tweet', a.expanded_url);
        });
    }

    return embed;
};

if (!(typeof exports === 'undefined')) {
    exports.Twitter = Twitter;
}
