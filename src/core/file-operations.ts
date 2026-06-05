import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../types';

const execAsync = promisify(exec);

export class FileOperations {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async open(filePath: string): Promise<void> {
    this.logger.info('Opening file', { path: filePath });
    
    const platform = process.platform;
    let command: string;

    if (platform === 'win32') {
      command = `start "" "${filePath}"`;
    } else if (platform === 'darwin') {
      command = `open "${filePath}"`;
    } else {
      command = `xdg-open "${filePath}"`;
    }

    try {
      await execAsync(command);
    } catch (error) {
      this.logger.error('Failed to open file', { path: filePath, error });
      throw new Error(`Failed to open file: ${filePath}`);
    }
  }

  async openInExplorer(filePath: string): Promise<void> {
    this.logger.info('Opening file in explorer', { path: filePath });
    
    const platform = process.platform;
    let command: string;

    if (platform === 'win32') {
      command = `explorer /select,"${filePath}"`;
    } else if (platform === 'darwin') {
      command = `open -R "${filePath}"`;
    } else {
      const dir = fs.statSync(filePath).isDirectory() ? filePath : path.dirname(filePath);
      command = `xdg-open "${dir}"`;
    }

    try {
      await execAsync(command);
    } catch (error) {
      this.logger.error('Failed to open in explorer', { path: filePath, error });
      throw new Error(`Failed to open in explorer: ${filePath}`);
    }
  }

  async copyPath(filePath: string): Promise<string> {
    this.logger.info('Copying path to clipboard', { path: filePath });
    
    const platform = process.platform;
    let command: string;

    if (platform === 'win32') {
      command = `echo|set /p="${filePath}"| clip`;
    } else if (platform === 'darwin') {
      command = `echo "${filePath}" | pbcopy`;
    } else {
      command = `echo -n "${filePath}" | xclip -selection clipboard`;
    }

    try {
      await execAsync(command);
      return filePath;
    } catch (error) {
      this.logger.error('Failed to copy path', { path: filePath, error });
      throw new Error(`Failed to copy path to clipboard`);
    }
  }

  async copyTo(source: string, destination: string): Promise<void> {
    this.logger.info('Copying file', { source, destination });

    try {
      const destDir = path.dirname(destination);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      await fs.promises.copyFile(source, destination);
      this.logger.info('File copied successfully', { source, destination });
    } catch (error) {
      this.logger.error('Failed to copy file', { source, destination, error });
      throw new Error(`Failed to copy file: ${source} to ${destination}`);
    }
  }

  async delete(filePaths: string[], moveToTrash: boolean = true): Promise<void> {
    this.logger.info('Deleting files', { paths: filePaths, moveToTrash });

    for (const filePath of filePaths) {
      try {
        if (!fs.existsSync(filePath)) {
          this.logger.warn('File does not exist', { path: filePath });
          continue;
        }

        if (moveToTrash) {
          await this.moveToTrash(filePath);
        } else {
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(filePath);
          }
        }

        this.logger.info('File deleted', { path: filePath });
      } catch (error) {
        this.logger.error('Failed to delete file', { path: filePath, error });
        throw new Error(`Failed to delete file: ${filePath}`);
      }
    }
  }

  private async moveToTrash(filePath: string): Promise<void> {
    const platform = process.platform;

    if (platform === 'win32') {
      const command = `powershell -Command "Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('${filePath}', 'OnlyErrorDialogs', 'SendToRecycleBin')"`;
      await execAsync(command);
    } else if (platform === 'darwin') {
      await execAsync(`osascript -e 'tell app "Finder" to move POSIX file "${filePath}" to trash'`);
    } else {
      const trashPath = path.join(process.env.HOME || '/tmp', '.local/share/Trash/files');
      if (!fs.existsSync(trashPath)) {
        fs.mkdirSync(trashPath, { recursive: true });
      }
      const destPath = path.join(trashPath, path.basename(filePath));
      fs.renameSync(filePath, destPath);
    }
  }

  exists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  getStats(filePath: string): fs.Stats {
    return fs.statSync(filePath);
  }

  isDirectory(filePath: string): boolean {
    try {
      return fs.statSync(filePath).isDirectory();
    } catch {
      return false;
    }
  }

  isFile(filePath: string): boolean {
    try {
      return fs.statSync(filePath).isFile();
    } catch {
      return false;
    }
  }

  getSize(filePath: string): number {
    try {
      return fs.statSync(filePath).size;
    } catch {
      return 0;
    }
  }

  getExtension(filePath: string): string {
    return path.extname(filePath).toLowerCase();
  }

  getName(filePath: string): string {
    return path.basename(filePath);
  }

  getDirectory(filePath: string): string {
    return path.dirname(filePath);
  }
}
