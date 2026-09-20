using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace PalmSentinelLauncher
{
    public static class Program
    {
        [STAThread]
        public static void Main()
        {
            string appDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
            string pythonw = FindPythonw();

            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = pythonw;
                psi.Arguments = "desktop_app.py";
                psi.WorkingDirectory = appDir;
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;
                psi.WindowStyle = ProcessWindowStyle.Hidden;

                Process p = Process.Start(psi);
                p.WaitForExit();
            }
            catch (Exception ex)
            {
                MessageBox.Show("Could not launch PalmSentinel Desktop Window: " + ex.Message, "PalmSentinel Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private static string FindPythonw()
        {
            string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string[] candidates = new string[]
            {
                Path.Combine(localApp, @"Programs\Python\Python314\pythonw.exe"),
                Path.Combine(localApp, @"Programs\Python\Python312\pythonw.exe"),
                Path.Combine(localApp, @"Programs\Python\Python311\pythonw.exe"),
                "pythonw.exe",
                "python.exe"
            };

            foreach (var p in candidates)
            {
                if (p == "pythonw.exe" || p == "python.exe" || File.Exists(p))
                    return p;
            }
            return "pythonw.exe";
        }
    }
}
