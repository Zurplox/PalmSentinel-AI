using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace PalmSentinelLauncher
{
    public class MainForm : Form
    {
        private Process serverProcess;
        private Label lblStatus;
        private Label lblPort;
        private Button btnOpenBrowser;
        private Button btnDataFolder;
        private Button btnResultsFolder;
        private Button btnRestartServer;
        private NotifyIcon trayIcon;
        private System.Windows.Forms.Timer statusTimer;
        private string appDir;
        private string pythonPath;

        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }

        public MainForm()
        {
            appDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
            pythonPath = FindPython();

            InitializeComponent();
            StartServer();

            statusTimer = new System.Windows.Forms.Timer();
            statusTimer.Interval = 2000;
            statusTimer.Tick += StatusTimer_Tick;
            statusTimer.Start();
        }

        private string FindPython()
        {
            string[] candidates = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\Python\Python314\python.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\Python\Python312\python.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\Python\Python311\python.exe"),
                "python.exe"
            };

            foreach (var p in candidates)
            {
                if (p == "python.exe" || File.Exists(p))
                    return p;
            }
            return "python.exe";
        }

        private void InitializeComponent()
        {
            this.Text = "PalmSentinel AI — Enterprise Drone Sensus Control";
            this.Size = new Size(540, 420);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;
            this.BackColor = Color.FromArgb(15, 23, 42); // Slate 900
            this.ForeColor = Color.White;
            this.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);

            // Header Panel
            Panel headerPanel = new Panel();
            headerPanel.Dock = DockStyle.Top;
            headerPanel.Height = 85;
            headerPanel.BackColor = Color.FromArgb(30, 41, 59); // Slate 800
            headerPanel.Padding = new Padding(20, 15, 20, 15);

            Label titleLabel = new Label();
            titleLabel.Text = "🌴 PalmSentinel AI";
            titleLabel.Font = new Font("Segoe UI", 16f, FontStyle.Bold);
            titleLabel.ForeColor = Color.FromArgb(52, 211, 153); // Emerald 400
            titleLabel.AutoSize = true;
            titleLabel.Location = new Point(18, 12);
            headerPanel.Controls.Add(titleLabel);

            Label subtitleLabel = new Label();
            subtitleLabel.Text = "Enterprise Drone Oil Palm Sensus & Analytics Platform (F: Drive)";
            subtitleLabel.Font = new Font("Segoe UI", 8.5f, FontStyle.Regular);
            subtitleLabel.ForeColor = Color.FromArgb(148, 163, 184); // Slate 400
            subtitleLabel.AutoSize = true;
            subtitleLabel.Location = new Point(22, 48);
            headerPanel.Controls.Add(subtitleLabel);

            this.Controls.Add(headerPanel);

            // Status Card Panel
            Panel cardPanel = new Panel();
            cardPanel.Location = new Point(22, 105);
            cardPanel.Size = new Size(480, 95);
            cardPanel.BackColor = Color.FromArgb(2, 6, 23); // Slate 950
            cardPanel.BorderStyle = BorderStyle.FixedSingle;

            lblStatus = new Label();
            lblStatus.Text = "⏳ Starting Vision Server...";
            lblStatus.Font = new Font("Segoe UI", 12f, FontStyle.Bold);
            lblStatus.ForeColor = Color.FromArgb(251, 191, 36); // Amber 400
            lblStatus.Location = new Point(15, 15);
            lblStatus.AutoSize = true;
            cardPanel.Controls.Add(lblStatus);

            lblPort = new Label();
            lblPort.Text = "Endpoint: http://127.0.0.1:5000 (138MP Native Engine)";
            lblPort.Font = new Font("Consolas", 9f, FontStyle.Regular);
            lblPort.ForeColor = Color.FromArgb(148, 163, 184);
            lblPort.Location = new Point(16, 52);
            lblPort.AutoSize = true;
            cardPanel.Controls.Add(lblPort);

            this.Controls.Add(cardPanel);

            // Action Buttons
            btnOpenBrowser = CreateButton("🌐 Open Sensus Dashboard in Browser", new Point(22, 220), new Size(480, 44), Color.FromArgb(5, 150, 105));
            btnOpenBrowser.Font = new Font("Segoe UI", 10.5f, FontStyle.Bold);
            btnOpenBrowser.Click += (s, e) => OpenBrowser();
            this.Controls.Add(btnOpenBrowser);

            btnDataFolder = CreateButton("📁 Open Drone Data Folder", new Point(22, 275), new Size(234, 38), Color.FromArgb(51, 65, 85));
            btnDataFolder.Click += (s, e) => OpenFolder(Path.Combine(appDir, "data"));
            this.Controls.Add(btnDataFolder);

            btnResultsFolder = CreateButton("📊 Open Results & CSV Folder", new Point(268, 275), new Size(234, 38), Color.FromArgb(51, 65, 85));
            btnResultsFolder.Click += (s, e) => OpenFolder(Path.Combine(appDir, "output"));
            this.Controls.Add(btnResultsFolder);

            btnRestartServer = CreateButton("🔄 Restart Server", new Point(22, 325), new Size(234, 34), Color.FromArgb(30, 41, 59));
            btnRestartServer.ForeColor = Color.FromArgb(148, 163, 184);
            btnRestartServer.Click += (s, e) => RestartServer();
            this.Controls.Add(btnRestartServer);

            Button btnExit = CreateButton("🛑 Stop & Exit", new Point(268, 325), new Size(234, 34), Color.FromArgb(159, 18, 57));
            btnExit.Click += (s, e) => this.Close();
            this.Controls.Add(btnExit);

            // Form Closing Handler
            this.FormClosing += MainForm_FormClosing;
        }

        private Button CreateButton(string text, Point loc, Size size, Color bgColor)
        {
            Button btn = new Button();
            btn.Text = text;
            btn.Location = loc;
            btn.Size = size;
            btn.BackColor = bgColor;
            btn.ForeColor = Color.White;
            btn.FlatStyle = FlatStyle.Flat;
            btn.FlatAppearance.BorderSize = 0;
            btn.Cursor = Cursors.Hand;
            return btn;
        }

        private void StartServer()
        {
            try
            {
                KillExistingOnPort5000();

                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = pythonPath;
                psi.Arguments = "app.py";
                psi.WorkingDirectory = appDir;
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;
                psi.WindowStyle = ProcessWindowStyle.Hidden;

                serverProcess = Process.Start(psi);

                lblStatus.Text = "⏳ Initializing Orthophoto & Server...";
                lblStatus.ForeColor = Color.FromArgb(251, 191, 36);

                // Asynchronously check for server readiness and launch browser
                ThreadPool.QueueUserWorkItem(state =>
                {
                    bool ready = false;
                    for (int i = 0; i < 30; i++)
                    {
                        Thread.Sleep(500);
                        if (CheckServerHealth())
                        {
                            ready = true;
                            break;
                        }
                    }

                    this.BeginInvoke((Action)(() =>
                    {
                        if (ready)
                        {
                            lblStatus.Text = "🟢 Online — Ready to Count Palms";
                            lblStatus.ForeColor = Color.FromArgb(52, 211, 153);
                            OpenBrowser();
                        }
                        else
                        {
                            lblStatus.Text = "⚠️ Server Running (Waiting for ready)";
                            lblStatus.ForeColor = Color.FromArgb(245, 158, 11);
                        }
                    }));
                });
            }
            catch (Exception ex)
            {
                lblStatus.Text = "❌ Failed to start server";
                lblStatus.ForeColor = Color.FromArgb(239, 68, 68);
                MessageBox.Show("Error starting PalmSentinel server: " + ex.Message, "Launch Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private bool CheckServerHealth()
        {
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:5000/api/info");
                req.Timeout = 1000;
                using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                {
                    return resp.StatusCode == HttpStatusCode.OK;
                }
            }
            catch
            {
                return false;
            }
        }

        private void StatusTimer_Tick(object sender, EventArgs e)
        {
            if (serverProcess != null && !serverProcess.HasExited)
            {
                if (CheckServerHealth())
                {
                    lblStatus.Text = "🟢 Online — Ready to Count Palms";
                    lblStatus.ForeColor = Color.FromArgb(52, 211, 153);
                }
            }
            else
            {
                lblStatus.Text = "⚪ Offline — Server Stopped";
                lblStatus.ForeColor = Color.FromArgb(148, 163, 184);
            }
        }

        private void OpenBrowser()
        {
            try
            {
                Process.Start("http://127.0.0.1:5000");
            }
            catch (Exception ex)
            {
                MessageBox.Show("Could not open web browser: " + ex.Message);
            }
        }

        private void OpenFolder(string path)
        {
            if (!Directory.Exists(path))
            {
                Directory.CreateDirectory(path);
            }
            Process.Start("explorer.exe", path);
        }

        private void RestartServer()
        {
            lblStatus.Text = "🔄 Restarting Server...";
            lblStatus.ForeColor = Color.FromArgb(251, 191, 36);
            StopServer();
            Thread.Sleep(800);
            StartServer();
        }

        private void StopServer()
        {
            try
            {
                if (serverProcess != null && !serverProcess.HasExited)
                {
                    serverProcess.Kill();
                    serverProcess.WaitForExit(1000);
                }
            }
            catch { }
            KillExistingOnPort5000();
        }

        private void KillExistingOnPort5000()
        {
            try
            {
                // Find and kill any orphan process listening on port 5000
                Process p = new Process();
                p.StartInfo.FileName = "cmd.exe";
                p.StartInfo.Arguments = "/c for /f \"tokens=5\" %a in ('netstat -aon ^| find \":5000\" ^| find \"LISTENING\"') do taskkill /f /pid %a";
                p.StartInfo.CreateNoWindow = true;
                p.StartInfo.UseShellExecute = false;
                p.Start();
                p.WaitForExit(1000);
            }
            catch { }
        }

        private void MainForm_FormClosing(object sender, FormClosingEventArgs e)
        {
            StopServer();
        }
    }
}
