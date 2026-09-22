using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace PalmSentinelLauncher
{
    public static class Program
    {
        [STAThread]
        public static int Main(string[] args)
        {
            string appDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
            string scriptPath = Path.Combine(appDir, "desktop_app.py");
            string pythonw = FindPython(appDir);

            bool isCheckMode = args != null && args.Length > 0 && 
                (args[0] == "--check" || args[0] == "--test" || args[0] == "-v" || args[0] == "--version");

            if (!File.Exists(scriptPath))
            {
                if (!isCheckMode)
                {
                    MessageBox.Show("Could not find 'desktop_app.py' in application directory:\n" + appDir, 
                        "PalmSentinel Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
                return 1;
            }

            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = pythonw;
                
                string extraArgs = (args != null && args.Length > 0) ? " " + string.Join(" ", args) : "";
                psi.Arguments = "\"" + scriptPath + "\"" + extraArgs;
                psi.WorkingDirectory = appDir;
                psi.UseShellExecute = false;

                if (isCheckMode)
                {
                    psi.CreateNoWindow = true;
                    psi.WindowStyle = ProcessWindowStyle.Hidden;
                    psi.RedirectStandardOutput = true;
                    psi.RedirectStandardError = true;
                }
                else
                {
                    psi.CreateNoWindow = true;
                    psi.WindowStyle = ProcessWindowStyle.Hidden;
                }

                using (Process p = Process.Start(psi))
                {
                    if (p == null) return 1;
                    p.WaitForExit();
                    return p.ExitCode;
                }
            }
            catch (Exception ex)
            {
                if (!isCheckMode)
                {
                    MessageBox.Show("Could not launch PalmSentinel Desktop Window:\n" + ex.Message, 
                        "PalmSentinel Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
                return 1;
            }
        }

        private static string FindPython(string appDir)
        {
            // 1. Check local virtual environments inside app directory
            string[] localVenvs = new string[]
            {
                Path.Combine(appDir, @"venv\Scripts\pythonw.exe"),
                Path.Combine(appDir, @".venv\Scripts\pythonw.exe"),
                Path.Combine(appDir, @"venv\Scripts\python.exe"),
                Path.Combine(appDir, @".venv\Scripts\python.exe")
            };
            foreach (var v in localVenvs)
            {
                if (File.Exists(v)) return v;
            }

            // 2. Check LocalAppData for Python 3.9 through 3.14
            string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string[] versions = new string[] { "Python314", "Python313", "Python312", "Python311", "Python310", "Python39" };

            foreach (var ver in versions)
            {
                string pyw = Path.Combine(localApp, @"Programs\Python\" + ver + @"\pythonw.exe");
                if (File.Exists(pyw)) return pyw;
                string py = Path.Combine(localApp, @"Programs\Python\" + ver + @"\python.exe");
                if (File.Exists(py)) return py;
            }

            // 3. Check Program Files and root drive Python installs
            string progFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            foreach (var ver in versions)
            {
                string pyw = Path.Combine(progFiles, ver + @"\pythonw.exe");
                if (File.Exists(pyw)) return pyw;
                string pywRoot = @"C:\" + ver + @"\pythonw.exe";
                if (File.Exists(pywRoot)) return pywRoot;
            }

            // 4. Check Windows PATH for pythonw.exe or python.exe
            string pathEnv = Environment.GetEnvironmentVariable("PATH") ?? "";
            string[] dirs = pathEnv.Split(';');
            foreach (var dir in dirs)
            {
                if (string.IsNullOrWhiteSpace(dir)) continue;
                try
                {
                    string candidateW = Path.Combine(dir.Trim(), "pythonw.exe");
                    if (File.Exists(candidateW)) return candidateW;
                }
                catch { }
            }
            foreach (var dir in dirs)
            {
                if (string.IsNullOrWhiteSpace(dir)) continue;
                try
                {
                    string candidate = Path.Combine(dir.Trim(), "python.exe");
                    if (File.Exists(candidate)) return candidate;
                }
                catch { }
            }

            // Fallback
            return "pythonw.exe";
        }
    }
}
