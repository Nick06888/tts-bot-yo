const discord = require('discord.js');
const settings = require('./settings');
const queue = require('./queue');
const tts = require('./ttsApi');
const translate = require('./translateApi');

const client = new discord.Client();
const audioQueue = new queue.Queue();
const settingsFile = './config.json';
const manageGuildPermission = 'MANAGE_GUILD';
const commandLookupTable = {
    'ping': cmdPing,
    'config': cmdConfig,
    'entra': cmdJoin,
    'esci': cmdLeave,
    'parla': cmdTts,
    'trs': cmdTrs,
    'tr': cmdTr,
    'aiuto': cmdHelp,

};

let inVoiceChannel = false;
let currentVoiceChannel = '';

client.on('ready', () => {
    console.log('Il bot è connesso al server!');

});

client.on('message', (msg) => {
    if (!isCommand(msg.content)) return;
    const { command, args } = parseCommand(msg.content);
    const cmdHandler = commandLookupTable[command];
    if (cmdHandler == undefined) {
        console.log(`Errore!, questo comando non esiste! (${command})`);
        msg.channel.send('Comando inesistente!');
    } else {
        cmdHandler(msg, args);
    }
});

/**
 * 
 * @param {String}
 */
function isCommand(msgContent) {
    return msgContent.startsWith(settings.getValue('prefix'));
}
/**
 * 
 * @param {String}
 */
function parseCommand(msgContent) {
    const cmdParts = msgContent.substring(settings.getValue('prefix').length);
    const commandIndex = cmdParts.indexOf(' ');
    if (commandIndex < 0) {
        return {
            command: cmdParts,
            args: [],
        }
    } else {
        const commandPart = cmdParts.substring(0, commandIndex);
        const argumentPart = cmdParts.substring(commandIndex + 1);
        const commandArguments = argumentPart.split(' ');
        return {
            command: commandPart,
            args: commandArguments,
        }
    }
}

/**
 * 
 * @param {discord.Message}
 */
function cmdPing(msg) {
    msg.channel.send('Pong!');
}

/**
 * 
 * @param {discord.Message}
 * @param {Array}
 */
function cmdConfig(msg, args) {
    if (args.length === 0) {
        msg.channel.send('Errore, uso sbagliato del comando!');
        return;
    }
    const mode = args[0];
    if (mode === 'vedi') {
        if (args.length !== 2) {
            msg.channel.send('Errore, uso sbagliato del comando!');
            return;

        }
        const val = settings.getValue(args[1]);
        msg.channel.send(`Il valore di \`${args[1]}\` è \`${val}\``);
    } else if (mode === 'setta') {
        if (args.length !== 3) {
            msg.channel.send('Errore, uso sbagliato del comando!');
            return;

        }
        const user = msg.member;
        const permessi = user.permissions.has(manageGuildPermission);
        if (permessi) {
            const configName = args[1];
            const configValue = args[2];
            settings.setValue(configName, configValue);
            msg.channel.send(`Successo! messo \`${configName}\` a \`${configValue}\``);
            settings.saveSettings(settingsFile);

        } else {
            msg.channel.send('Non hai abbastanza permessi.');

        }
    } else {
        msg.channel.send('Errore, uso sbagliato del comando!');
    }

}

/**
 * 
 * @param {discord.Message}
 */
async function cmdJoin(msg) {
    await _join(msg);
}

/**
 * 
 * @param {discord.Message}
 */
function _join(msg) {
    return new Promise((resolve, reject) => {
        if (!msg.guild) {
            reject();
            return;
        }

        if (!msg.member.voice.channel) {
            msg.channel.send(`<@${msg.member.id}>, non sei in una vocale.`);
            reject();
            return;
        }

        if (inVoiceChannel) {
            msg.channel.send(`<@${msg.member.id}>, sono già in una vocale.`);

        }

        const grantedPermissions = msg.member.voice.channel.permissionsFor(msg.client.user)
        if (!grantedPermissions.has('SPEAK') || !grantedPermissions.has('CONNECT')) {
            msg.channel.send(`<@${msg.member.id}>, non ho abbastanza permessi!`);
            reject();
            return;
        }


        let audioPlayer;
        msg.member.voice.channel.join().then(async (connection) => {
            resolve();
            currentVoiceChannel = msg.member.voice.channelID;
            inVoiceChannel = true;
            console.log('Connesso ad una vocale!');

            /**
             * 
             * @param {discord.StreamDispatcher}
             */
            const waitUntilEnd = (currentPlayer) => {
                return new Promise((resolve) => {
                    currentPlayer.on('end', () => resolve());
                });
            };

            while (inVoiceChannel) {
                const audioUrl = await audioQueue.getNext();
                if (!inVoiceChannel || audioUrl === undefined) break;
                audioPlayer = connection.play(audioUrl);
                await waitUntilEnd(audioPlayer);
            }
        });
    });
}

/**
 * 
 * @param {discord.Message}
 */
function cmdLeave(msg) {
    if (!msg.guild) return;
    if (!msg.member.voice.channel) {
        msg.channel.send(`<@${msg.member.id}>, non sei in una vocale.`);
        return;
    }
    if (!inVoiceChannel) {
        msg.channel.send(`<@${msg.member.id}>, non sono in una vocale.`);
        return;
    }
    if (currentVoiceChannel !== msg.member.voice.channelID) {
        msg.channel.send(`<@${msg.member.id}>, non siamo nella stessa vocale.`);
        return;
    }
    msg.member.voice.channel.leave();
    console.log('Uscito dalla vocale');
    inVoiceChannel = false;
    currentVoiceChannel = '';
    audioQueue.clearAndStop();
}

/**
 * 
 * @param {discord.Message}
 * @param {Array}
 */
async function cmdTts(msg, args) {
    if (!inVoiceChannel) {
        try {
            await _join(msg);
        } catch (_) {
            return;
        }
    }
    if (currentVoiceChannel !== msg.member.voice.channelID) {
        msg.channel.send(`<@${msg.member.id}>, non siamo nella stessa vocale`);
        return;
    }
    if (args.length < 2) {
        msg.channel.send('Errore, uso sbagliato del comando.');
        return;

    }

    const ttsUrl = await tts.getTTSUrl(args.splice(1, args.length - 1).join(' '), args[0]);
    audioQueue.push(ttsUrl);
}

/**
 * 
 * @param {discord.Message}
 * @param {Array}
 */
async function cmdTrs(msg, args) {
    if (!inVoiceChannel) {
        try {
            await _join(msg);
        } catch (_) {
            return;
        }
    }

    if (currentVoiceChannel !== msg.member.voice.channelID) {
        msg.channel.send(`<@${msg.member.id}>, non siamo nella stessa vocale`);
        return;

    }
    if (args.length < 3) {
        msg.channel.send('Errore, uso sbagliato del comando.');
        return;
    }

    const trsUrl = await tts.getTRSUrl(args[0], args[1], args.splice(2, args.length - 2).join(' '));
    if (trsUrl !== undefined) audioQueue.push(trsUrl);
    else {
        msg.channel.send(`<@${msg.member.id}>, linguaggi incorretti!`);

    }
}
/**
 * 
 * @param {discord.Message}
 * @param {Array}
 */
async function cmdTr(msg, args) {
    if (args.length < 3) {
        msg.channel.send('Errore, uso sbagliato del comando.');
        return;
    }
    const langFrom = args[0];
    const langTo = args[1];
    const text = args.splice(2, args.length - 2).join(' ');
    const result = await translate.getTextResult(langFrom, langTo, text);
    const header = `[Messaggio tradotto da ${msg.member.displayName}]: `;

    if (msg.deletable) msg.delete();
    msg.channel.send(header + result);

}

/**
 * 
 * @param {discord.Message}
 */
function cmdHelp(msg) {
    let helpText = '';
    helpText += '`aiuto` - mostra questo menu\n';
    helpText += '`ping` - scoprilo ;)\n';
    helpText += '`config` [vedi/setta] [opzione] [valore] - configura il tuo bot: ADMIN\n';
    helpText += '`entra` - fai entrare il bot nella tua vocale\n';
    helpText += '`esci` - fai uscire il bot dalla tua vocale\n';
    helpText += '`parla` [voce] [testo] - fai parlare il bot in vocale\n';
    helpText += '`trs` [da lingua] [a lingua] [testo] - Traduce il tuo messaggio e lo manda in vocale\n';
    helpText += '`tr` [da lingua] [a lingua] [testo] - Traduce il tuo messaggio e lo manda in chat\n';
    msg.member.send(helpText);

}

settings.loadSettings(settingsFile);
client.login(settings.getValue('token'));