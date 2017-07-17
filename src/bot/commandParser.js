import { commands } from './commands';
import config from '../util/config';
import { regexEscape } from '../util';


/**
 * Creates a message event handler parsing commands from incoming messages.
 *
 * @param      {Discord.js.Client}  client  The Discord.js client
 * @return     {Function}  Message event handler
 */
const createCommandParser = (client) => {
  const {
    allowedChannels,
    prefix
  } = config.get('bot');

  const _prefix = regexEscape(prefix);
  const pattern = RegExp(`^${_prefix}(\\w+)\\s*(.*)$`);

  const messageHandler = (message) => {
    // ignore own messages
    const {
      user: {
        id: botUserId
      }
    } = client;
    const {
      author: {
        id: authorUserId
      }
    } = message;

    if (botUserId === authorUserId) {
      return;
    }

    // check bot-level DM/TextChannel permissions
    const {
      channel,
      content
    } = message;
    const { type } = channel;
    const isDM = type === 'dm';
    const isText = type === 'text';
    const isAllowedChannel = isText && allowedChannels.includes(channel.name);

    if (!isDM && !isAllowedChannel) {
      return;
    }

    // check if message looks like a command
    const match = content.match(pattern);

    if (!match) {
      return;
    }

    // find a matching command
    const [, commandName, opts  = ''] = match;
    const command = commands.find(cmd => cmd.name === commandName);

    if (command) {
      // check command-level DM/TextChannel permissions
      const {
        allowDirectMessage,
        allowChannelMessage
      } = command;

      if (
        (isDM && !allowDirectMessage) ||
        (isAllowedChannel && !allowChannelMessage)
      ) {
        return;
      }

      // check that command options can be parsed from message
      let options = null;
      if (command.optionParser) {
        const parsedOptions = opts.match(command.optionParser);

        if (!parsedOptions) {
          return;
        }

        options = parsedOptions.slice(1);
      }

      // execute the command's run method
      command.run({
        client,
        message,
        options
      });
    }
  };

  return messageHandler;
};

export default createCommandParser;