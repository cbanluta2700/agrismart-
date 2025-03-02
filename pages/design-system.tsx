import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

const DesignSystemPage = () => {
  return (
    <div className="py-10 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
      <Head>
        <title>AgriSmart Design System</title>
        <meta name="description" content="AgriSmart Design System documentation" />
      </Head>

      <header className="mb-12 animate-fade-up">
        <h1 className="text-4xl font-bold mb-2">AgriSmart Design System</h1>
        <p className="text-lg text-slate-500 dark:text-slate-400">
          A comprehensive guide to our premium UI components and utilities
        </p>
        <div className="h-1 w-20 bg-gradient-to-r from-bright-green to-forest-green mt-4"></div>
      </header>

      <nav className="flex flex-wrap gap-4 mb-10 sticky top-0 bg-white dark:bg-slate-900 py-4 z-10 shadow-sm">
        <Link href="#colors" className="btn-outline">Colors</Link>
        <Link href="#typography" className="btn-outline">Typography</Link>
        <Link href="#buttons" className="btn-outline">Buttons</Link>
        <Link href="#cards" className="btn-outline">Cards</Link>
        <Link href="#forms" className="btn-outline">Form Elements</Link>
        <Link href="#badges" className="btn-outline">Badges</Link>
        <Link href="#tables" className="btn-outline">Tables</Link>
        <Link href="#status" className="btn-outline">Status Indicators</Link>
        <Link href="#animations" className="btn-outline">Animations</Link>
      </nav>

      <main className="space-y-20">
        {/* Colors Section */}
        <section id="colors" className="scroll-mt-20 animate-fade-up">
          <h2 className="text-3xl font-bold mb-6">Colors</h2>
          <p className="mb-6 text-slate-700 dark:text-slate-300">
            Our color system is designed to reinforce brand identity and ensure accessibility across the platform.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ColorItem name="Forest Green Dark" hex="#030A06" className="bg-forest-green-dark" />
            <ColorItem name="Forest Green" hex="#0D3F1F" className="bg-forest-green" />
            <ColorItem name="Bright Green" hex="#38FF7E" className="bg-bright-green" />
            <ColorItem name="Light Green" hex="#E3FFED" className="bg-light-green" />
            <ColorItem name="Muted Green" hex="#8B949E" className="bg-muted-green" />
            <ColorItem name="Primary HSL" hsl="var(--primary)" className="bg-hsl-primary" />
          </div>
        </section>

        {/* Typography Section */}
        <section id="typography" className="scroll-mt-20 animate-fade-up">
          <h2 className="text-3xl font-bold mb-6">Typography</h2>
          <p className="mb-6 text-slate-700 dark:text-slate-300">
            Our typography scale is designed for readability and hierarchy across all devices.
          </p>
          <div className="space-y-8">
            <div className="space-y-4">
              <h1>Heading 1 - 4xl (2rem - 32px)</h1>
              <h2>Heading 2 - 3xl (1.75rem - 28px)</h2>
              <h3>Heading 3 - 2xl (1.5rem - 24px)</h3>
              <h4>Heading 4 - xl (1.25rem - 20px)</h4>
              <h5 className="text-lg font-bold">Heading 5 - lg (1.125rem - 18px)</h5>
              <h6 className="text-base font-bold">Heading 6 - base (1rem - 16px)</h6>
            </div>
            <div className="space-y-4">
              <p className="text-lg">
                Large paragraph text (1.125rem - 18px). Used for introductory paragraphs and important content.
              </p>
              <p>
                Base paragraph text (1rem - 16px). Default text size for most content across the application.
              </p>
              <p className="text-sm">
                Small text (0.875rem - 14px). Used for captions, metadata, and less important information.
              </p>
              <p className="text-xs">
                Extra small text (0.75rem - 12px). Used sparingly for very small labels and footnotes.
              </p>
            </div>
          </div>
        </section>

        {/* Buttons Section */}
        <section id="buttons" className="scroll-mt-20 animate-fade-up">
          <h2 className="text-3xl font-bold mb-6">Buttons</h2>
          <p className="mb-6 text-slate-700 dark:text-slate-300">
            Our button system provides consistent interaction patterns across the platform.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold mb-2">Primary</h3>
              <button className="btn-primary">Primary Button</button>
              <button className="btn-primary btn-sm">Small</button>
              <button className="btn-primary btn-lg">Large</button>
              <button className="btn-primary" disabled>Disabled</button>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold mb-2">Secondary</h3>
              <button className="btn-outline">Outline Button</button>
              <button className="btn-ghost">Ghost Button</button>
              <button className="btn-danger">Danger Button</button>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold mb-2">Premium</h3>
              <button className="btn-premium">Premium Button</button>
              <button className="btn-premium btn-sm">Small Premium</button>
              <button className="btn-premium btn-lg">Large Premium</button>
              <button className="btn-premium animate-glow">Glowing</button>
            </div>
          </div>
        </section>

        {/* Cards Section */}
        <section id="cards" className="scroll-mt-20 animate-fade-up">
          <h2 className="text-3xl font-bold mb-6">Cards</h2>
          <p className="mb-6 text-slate-700 dark:text-slate-300">
            Cards are used to group related content and actions.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Standard Card</h3>
                <p className="card-description">This is a standard card component</p>
              </div>
              <div className="card-content">
                <p>Cards contain related content and actions about a single subject.</p>
              </div>
              <div className="card-footer">
                <button className="btn-primary">Action</button>
              </div>
            </div>
            <div className="card-premium animate-float-slow">
              <div className="card-header">
                <h3 className="card-title">Premium Card</h3>
                <p className="card-description">Glass effect with animations</p>
              </div>
              <div className="card-content">
                <p>Premium cards feature a glass-morphism effect with subtle animations.</p>
              </div>
              <div className="card-footer">
                <button className="btn-premium">Premium Action</button>
              </div>
            </div>
          </div>
        </section>

        {/* Form Elements Section */}
        <section id="forms" className="scroll-mt-20 animate-fade-up">
          <h2 className="text-3xl font-bold mb-6">Form Elements</h2>
          <p className="mb-6 text-slate-700 dark:text-slate-300">
            Consistent form elements ensure a unified input experience.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="name">Name</label>
                <input id="name" className="input" type="text" placeholder="Enter your name" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
                <input id="email" className="input" type="email" placeholder="Enter your email" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="disabled">Disabled</label>
                <input id="disabled" className="input" type="text" placeholder="Disabled input" disabled />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="select">Select</label>
                <select id="select" className="select">
                  <option value="option1">Option 1</option>
                  <option value="option2">Option 2</option>
                  <option value="option3">Option 3</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="textarea">Textarea</label>
                <textarea id="textarea" className="textarea" placeholder="Enter your message"></textarea>
              </div>
            </div>
          </div>
        </section>

        {/* Badges Section */}
        <section id="badges" className="scroll-mt-20 animate-fade-up">
          <h2 className="text-3xl font-bold mb-6">Badges</h2>
          <p className="mb-6 text-slate-700 dark:text-slate-300">
            Badges help highlight status, counts, or categories.
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="badge-default">Default</div>
            <div className="badge-primary">Primary</div>
            <div className="badge-secondary">Secondary</div>
            <div className="badge-success">Success</div>
            <div className="badge-danger">Danger</div>
            <div className="badge-warning">Warning</div>
            <div className="badge-outline">Outline</div>
          </div>
        </section>

        {/* Tables Section */}
        <section id="tables" className="scroll-mt-20 animate-fade-up">
          <h2 className="text-3xl font-bold mb-6">Tables</h2>
          <p className="mb-6 text-slate-700 dark:text-slate-300">
            Tables display structured data with consistent styling.
          </p>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-head">Name</th>
                  <th className="table-head">Status</th>
                  <th className="table-head">Role</th>
                  <th className="table-head">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                <tr className="table-row">
                  <td className="table-cell">John Doe</td>
                  <td className="table-cell">
                    <div className="status-badge status-approved">Approved</div>
                  </td>
                  <td className="table-cell">Admin</td>
                  <td className="table-cell">
                    <button className="btn-sm btn-outline">Edit</button>
                  </td>
                </tr>
                <tr className="table-row">
                  <td className="table-cell">Jane Smith</td>
                  <td className="table-cell">
                    <div className="status-badge status-pending">Pending</div>
                  </td>
                  <td className="table-cell">Editor</td>
                  <td className="table-cell">
                    <button className="btn-sm btn-outline">Edit</button>
                  </td>
                </tr>
                <tr className="table-row">
                  <td className="table-cell">Bob Johnson</td>
                  <td className="table-cell">
                    <div className="status-badge status-rejected">Rejected</div>
                  </td>
                  <td className="table-cell">Viewer</td>
                  <td className="table-cell">
                    <button className="btn-sm btn-outline">Edit</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Status Indicators Section */}
        <section id="status" className="scroll-mt-20 animate-fade-up">
          <h2 className="text-3xl font-bold mb-6">Status Indicators</h2>
          <p className="mb-6 text-slate-700 dark:text-slate-300">
            Status indicators provide visual cues for content state.
          </p>
          <div className="space-y-4">
            <div className="status-badge status-approved">Approved</div>
            <div className="status-badge status-pending">Pending</div>
            <div className="status-badge status-rejected">Rejected</div>
            <div className="status-badge status-draft">Draft</div>
          </div>
        </section>

        {/* Animations Section */}
        <section id="animations" className="scroll-mt-20 animate-fade-up">
          <h2 className="text-3xl font-bold mb-6">Animations</h2>
          <p className="mb-6 text-slate-700 dark:text-slate-300">
            Our animation library provides subtle motion for enhanced UX.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="card p-6 flex flex-col items-center">
              <div className="w-16 h-16 bg-hsl-primary rounded-lg mb-4 animate-glow"></div>
              <p className="font-medium">Glow Animation</p>
              <code className="text-sm text-slate-500 mt-2">animate-glow</code>
            </div>
            <div className="card p-6 flex flex-col items-center">
              <div className="w-16 h-16 bg-hsl-accent rounded-lg mb-4 animate-float"></div>
              <p className="font-medium">Float Animation</p>
              <code className="text-sm text-slate-500 mt-2">animate-float</code>
            </div>
            <div className="card p-6 flex flex-col items-center">
              <div className="w-16 h-16 border-2 border-hsl-accent rounded-lg mb-4 animate-[pulse-border_3s_ease-in-out_infinite]"></div>
              <p className="font-medium">Pulse Border</p>
              <code className="text-sm text-slate-500 mt-2">animate-pulse-border</code>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-20 pt-10 border-t border-slate-200 dark:border-slate-800 text-center">
        <p className="text-slate-500">
          AgriSmart Design System &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
};

const ColorItem = ({ name, hex, hsl, className }: { name: string; hex?: string; hsl?: string; className: string }) => {
  return (
    <div className="flex flex-col">
      <div className={`h-20 rounded-md ${className} shadow-md`}></div>
      <div className="mt-2">
        <p className="font-medium">{name}</p>
        <p className="text-sm text-slate-500">{hex || hsl}</p>
      </div>
    </div>
  );
};

export default DesignSystemPage;
