import { ConnectionOptions } from 'typeorm/connection/ConnectionOptions';
import config from './config';

const ormconfig: ConnectionOptions = config.extendedDb as ConnectionOptions;

export default ormconfig;
