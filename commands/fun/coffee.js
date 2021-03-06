const roles = require('../../config/roles'),
    Discord = require('discord.js');

exports.run = (bot, message, args) => {
    let embed = new Discord.RichEmbed({
        thumbnail: {
            url: 'https://deratrox.de/dev/Bronies.de-DSB/_coffee.png'
        },
        description: '**☕ Eine Kanne brühend heißer Kaffee steht bereit!**',
        color: 0x6f4e37
    }).setFooter(`Kaffee angefordert von ${bot.server.members.get(message.author.id).displayName} | Art by Assiel`);

    message.channel.send({embed});
};

exports.config = {
    cooldown: 15,
    aliases: ['kaffee'],
    skip: roles.moderator
};

exports.help = {
    name: 'coffee',
    description: 'Eine Kanne Kaffe in den Chat stellen.',
    usage: ['!coffee']
};