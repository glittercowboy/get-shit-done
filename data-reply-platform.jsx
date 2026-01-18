import React, { useState } from 'react';
import { Database, GitBranch, Code2, Layers, Search, Zap, CheckCircle2, ArrowRight, Brain, Server, Cloud, Activity, FileCode, Table2, Network, Sparkles, ChevronRight, Play, Settings, BarChart3, Shield, Users } from 'lucide-react';

// Data Reply color palette based on brand
const colors = {
  primary: '#8BC53F',     // Data Reply green
  secondary: '#00A651',   // Darker green
  accent: '#FF9900',      // AWS orange
  dark: '#1a1a2e',
  darker: '#0f0f1a',
  text: '#e0e0e0',
  muted: '#8b8b9b'
};

export default function DataReplyAgenticPlatform() {
  const [activeModule, setActiveModule] = useState('lineage');
  const [activeTab, setActiveTab] = useState('overview');

  const modules = [
    {
      id: 'lineage',
      name: 'Data Lineage & Quality',
      icon: GitBranch,
      description: 'Profile, validate, and trace your data journey',
      agents: ['Data Profiler', 'DQ Recommender', 'Data Validator'],
      color: '#8BC53F'
    },
    {
      id: 'modelling',
      name: 'Data Modelling',
      icon: Layers,
      description: 'AI-powered schema design and DDL generation',
      agents: ['Schema Analyzer', 'Model Generator', 'DDL Builder'],
      color: '#00A651'
    },
    {
      id: 'conversion',
      name: 'Scripts Conversion',
      icon: Code2,
      description: 'Transform legacy code to modern patterns',
      agents: ['Code Analyzer', 'Pattern Matcher', 'Regenerator'],
      color: '#FF9900'
    }
  ];

  const stats = [
    { label: 'Active Agents', value: '9', icon: Brain },
    { label: 'Data Sources', value: '17', icon: Database },
    { label: 'Rules Generated', value: '2.4K', icon: Shield },
    { label: 'Lines Converted', value: '100K+', icon: FileCode }
  ];

  const awsServices = [
    { name: 'SageMaker Lakehouse', status: 'connected', icon: Cloud },
    { name: 'Amazon Bedrock', status: 'connected', icon: Brain },
    { name: 'S3 Iceberg Tables', status: 'syncing', icon: Database },
    { name: 'Step Functions', status: 'connected', icon: Activity }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${colors.darker} 0%, ${colors.dark} 50%, #1a2a1a 100%)`,
      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      color: colors.text,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          radial-gradient(circle at 20% 80%, rgba(139, 197, 63, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(0, 166, 81, 0.06) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(255, 153, 0, 0.04) 0%, transparent 50%)
        `,
        pointerEvents: 'none'
      }} />

      {/* Grid overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `linear-gradient(rgba(139, 197, 63, 0.03) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(139, 197, 63, 0.03) 1px, transparent 1px)`,
        backgroundSize: '50px 50px',
        pointerEvents: 'none'
      }} />

      {/* Header */}
      <header style={{
        position: 'relative',
        padding: '20px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(139, 197, 63, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Data Reply Logo */}
          <div style={{
            width: '48px',
            height: '48px',
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(139, 197, 63, 0.3)'
          }}>
            <Sparkles size={28} color="#fff" />
          </div>
          <div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: '700',
              margin: 0,
              background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              DATA REPLY
            </h1>
            <p style={{ margin: 0, fontSize: '12px', color: colors.muted, letterSpacing: '2px' }}>
              AGENTIC FOR DATA
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(255, 153, 0, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 153, 0, 0.3)'
          }}>
            <Cloud size={16} color={colors.accent} />
            <span style={{ fontSize: '13px', color: colors.accent }}>AWS Connected</span>
          </div>
          <button style={{
            padding: '10px 20px',
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Play size={16} />
            Run Pipeline
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', position: 'relative' }}>
        {/* Sidebar */}
        <aside style={{
          width: '280px',
          padding: '24px',
          borderRight: '1px solid rgba(139, 197, 63, 0.15)'
        }}>
          <nav>
            <p style={{ 
              fontSize: '11px', 
              color: colors.muted, 
              letterSpacing: '1.5px', 
              marginBottom: '12px',
              fontWeight: '600'
            }}>
              MODULES
            </p>
            {modules.map((module) => {
              const Icon = module.icon;
              const isActive = activeModule === module.id;
              return (
                <button
                  key={module.id}
                  onClick={() => setActiveModule(module.id)}
                  style={{
                    width: '100%',
                    padding: '16px',
                    marginBottom: '8px',
                    background: isActive 
                      ? `linear-gradient(135deg, ${module.color}15, ${module.color}08)`
                      : 'transparent',
                    border: isActive 
                      ? `1px solid ${module.color}40` 
                      : '1px solid transparent',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: `${module.color}20`,
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Icon size={20} color={module.color} />
                    </div>
                    <div>
                      <p style={{ 
                        margin: 0, 
                        fontSize: '14px', 
                        fontWeight: '600',
                        color: isActive ? '#fff' : colors.text
                      }}>
                        {module.name}
                      </p>
                      <p style={{ margin: 0, fontSize: '11px', color: colors.muted }}>
                        {module.agents.length} agents
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* AWS Services Status */}
          <div style={{ marginTop: '32px' }}>
            <p style={{ 
              fontSize: '11px', 
              color: colors.muted, 
              letterSpacing: '1.5px', 
              marginBottom: '12px',
              fontWeight: '600'
            }}>
              AWS SERVICES
            </p>
            {awsServices.map((service) => {
              const Icon = service.icon;
              return (
                <div key={service.name} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  marginBottom: '6px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon size={14} color={colors.accent} />
                    <span style={{ fontSize: '12px', color: colors.text }}>{service.name}</span>
                  </div>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: service.status === 'connected' ? colors.primary : colors.accent,
                    boxShadow: `0 0 8px ${service.status === 'connected' ? colors.primary : colors.accent}`
                  }} />
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, padding: '32px' }}>
          {/* Stats Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '20px',
            marginBottom: '32px'
          }}>
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} style={{
                  padding: '24px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '16px',
                  border: '1px solid rgba(139, 197, 63, 0.1)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <Icon size={20} color={colors.primary} />
                    <span style={{ fontSize: '13px', color: colors.muted }}>{stat.label}</span>
                  </div>
                  <p style={{ 
                    fontSize: '36px', 
                    fontWeight: '700', 
                    margin: 0,
                    background: `linear-gradient(135deg, #fff, ${colors.primary})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    {stat.value}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Module Content */}
          {activeModule === 'lineage' && <LineageModule />}
          {activeModule === 'modelling' && <ModellingModule />}
          {activeModule === 'conversion' && <ConversionModule />}
        </main>
      </div>
    </div>
  );
}

function LineageModule() {
  const agents = [
    {
      name: 'Data Profiler',
      description: 'AI-powered scanning of data assets to generate profile summaries',
      features: ['Quality & Completeness', 'Distribution Analysis', 'Pattern Detection'],
      status: 'ready',
      icon: Search
    },
    {
      name: 'DQ Recommender',
      description: 'GenAI solution for contextual validation rule recommendations',
      features: ['Industry Rules', 'Reasoning Support', 'Auto-Configuration'],
      status: 'ready',
      icon: Brain
    },
    {
      name: 'Data Validator',
      description: 'Automated validation with alerts and actionable insights',
      features: ['Custom Rules', 'Real-time Alerts', 'Pipeline Integration'],
      status: 'running',
      icon: Shield
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0' }}>
          Data Lineage & Quality
        </h2>
        <p style={{ color: '#8b8b9b', margin: 0 }}>
          Profile, validate, and trace data from source to consumption
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px'
      }}>
        {agents.map((agent) => {
          const Icon = agent.icon;
          return (
            <div key={agent.name} style={{
              padding: '28px',
              background: 'linear-gradient(135deg, rgba(139, 197, 63, 0.08), rgba(0, 166, 81, 0.04))',
              borderRadius: '20px',
              border: '1px solid rgba(139, 197, 63, 0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '100px',
                height: '100px',
                background: 'radial-gradient(circle, rgba(139, 197, 63, 0.15), transparent)',
                borderRadius: '50%'
              }} />

              <div style={{
                width: '56px',
                height: '56px',
                background: 'linear-gradient(135deg, #8BC53F, #00A651)',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                boxShadow: '0 8px 24px rgba(139, 197, 63, 0.3)'
              }}>
                <Icon size={28} color="#fff" />
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 8px 0' }}>
                {agent.name}
              </h3>
              <p style={{ fontSize: '13px', color: '#8b8b9b', margin: '0 0 20px 0', lineHeight: '1.6' }}>
                {agent.description}
              </p>

              <div style={{ marginBottom: '20px' }}>
                {agent.features.map((feature) => (
                  <div key={feature} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px'
                  }}>
                    <CheckCircle2 size={14} color="#8BC53F" />
                    <span style={{ fontSize: '12px', color: '#e0e0e0' }}>{feature}</span>
                  </div>
                ))}
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: agent.status === 'running' 
                    ? 'rgba(255, 153, 0, 0.15)' 
                    : 'rgba(139, 197, 63, 0.15)',
                  borderRadius: '6px'
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: agent.status === 'running' ? '#FF9900' : '#8BC53F',
                    animation: agent.status === 'running' ? 'pulse 1.5s infinite' : 'none'
                  }} />
                  <span style={{ 
                    fontSize: '11px', 
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: agent.status === 'running' ? '#FF9900' : '#8BC53F'
                  }}>
                    {agent.status}
                  </span>
                </div>
                <button style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid rgba(139, 197, 63, 0.4)',
                  borderRadius: '8px',
                  color: '#8BC53F',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  Configure
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Architecture Preview */}
      <div style={{
        marginTop: '32px',
        padding: '28px',
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '20px',
        border: '1px solid rgba(139, 197, 63, 0.1)'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 20px 0' }}>
          Pipeline Flow
        </h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          {['Source Data', 'Profiler Agent', 'DQ Rules', 'Validator', 'Lakehouse'].map((step, i) => (
            <React.Fragment key={step}>
              <div style={{
                flex: 1,
                padding: '16px',
                background: i === 0 ? 'rgba(255, 153, 0, 0.1)' : 
                           i === 4 ? 'rgba(139, 197, 63, 0.1)' : 
                           'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                textAlign: 'center',
                border: `1px solid ${i === 0 ? 'rgba(255, 153, 0, 0.3)' : 
                                    i === 4 ? 'rgba(139, 197, 63, 0.3)' : 
                                    'rgba(255, 255, 255, 0.05)'}`
              }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: '500' }}>{step}</p>
              </div>
              {i < 4 && (
                <ArrowRight size={20} color="#8BC53F" style={{ flexShrink: 0 }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModellingModule() {
  const stages = [
    { name: 'Conceptual', desc: 'Entity mapping & core relationships', progress: 100 },
    { name: 'Logical', desc: 'PK/FK identification & cardinality', progress: 75 },
    { name: 'Physical', desc: 'DDL generation & optimization', progress: 40 }
  ];

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0' }}>
          Data Modelling
        </h2>
        <p style={{ color: '#8b8b9b', margin: 0 }}>
          AI-accelerated schema design from conceptual to physical
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '24px'
      }}>
        <div style={{
          padding: '28px',
          background: 'linear-gradient(135deg, rgba(0, 166, 81, 0.08), rgba(139, 197, 63, 0.04))',
          borderRadius: '20px',
          border: '1px solid rgba(0, 166, 81, 0.2)'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 24px 0' }}>
            Model Generation Pipeline
          </h3>
          
          {stages.map((stage, i) => (
            <div key={stage.name} style={{ marginBottom: i < 2 ? '24px' : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontWeight: '600', marginRight: '12px' }}>{stage.name}</span>
                  <span style={{ fontSize: '12px', color: '#8b8b9b' }}>{stage.desc}</span>
                </div>
                <span style={{ color: '#8BC53F', fontWeight: '600' }}>{stage.progress}%</span>
              </div>
              <div style={{
                height: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${stage.progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #00A651, #8BC53F)',
                  borderRadius: '4px',
                  transition: 'width 0.5s ease'
                }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{
          padding: '28px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '20px',
          border: '1px solid rgba(139, 197, 63, 0.1)'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 20px 0' }}>
            Output Formats
          </h3>
          {['SQL DDL Scripts', 'ER Diagrams', 'Mermaid Syntax', 'JSON Schema'].map((format) => (
            <div key={format} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              marginBottom: '8px',
              background: 'rgba(139, 197, 63, 0.05)',
              borderRadius: '8px'
            }}>
              <FileCode size={16} color="#8BC53F" />
              <span style={{ fontSize: '13px' }}>{format}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConversionModule() {
  const conversions = [
    { from: 'SAS', to: 'PySpark', files: 847, status: 'in_progress' },
    { from: 'SQL Server', to: 'Redshift', files: 234, status: 'ready' },
    { from: '.NET', to: 'Python', files: 156, status: 'ready' }
  ];

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0' }}>
          Scripts Conversion
        </h2>
        <p style={{ color: '#8b8b9b', margin: 0 }}>
          Transform legacy code to modern cloud-native patterns
        </p>
      </div>

      <div style={{
        padding: '28px',
        background: 'linear-gradient(135deg, rgba(255, 153, 0, 0.08), rgba(255, 153, 0, 0.02))',
        borderRadius: '20px',
        border: '1px solid rgba(255, 153, 0, 0.2)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'linear-gradient(135deg, #FF9900, #FF6600)',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Code2 size={28} color="#fff" />
          </div>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
              ReGeneration Engine
            </h3>
            <p style={{ margin: 0, color: '#8b8b9b', fontSize: '13px' }}>
              Human-in-the-loop code transformation with AI acceleration
            </p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px'
        }}>
          {conversions.map((conv) => (
            <div key={conv.from} style={{
              padding: '20px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 153, 0, 0.15)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px'
              }}>
                <span style={{ 
                  padding: '4px 10px', 
                  background: 'rgba(255, 255, 255, 0.1)', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {conv.from}
                </span>
                <ArrowRight size={16} color="#FF9900" />
                <span style={{ 
                  padding: '4px 10px', 
                  background: 'rgba(139, 197, 63, 0.15)', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#8BC53F'
                }}>
                  {conv.to}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>
                {conv.files}
                <span style={{ fontSize: '12px', color: '#8b8b9b', fontWeight: '400', marginLeft: '6px' }}>
                  files
                </span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Process Steps */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px'
      }}>
        {[
          { step: '1', title: 'Identify', desc: 'Analyze legacy assets' },
          { step: '2', title: 'Categorize', desc: 'Assess usage & criticality' },
          { step: '3', title: 'Map', desc: 'Define target patterns' },
          { step: '4', title: 'Convert', desc: 'Generate & validate' }
        ].map((item) => (
          <div key={item.step} style={{
            padding: '20px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 153, 0, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: 'linear-gradient(135deg, #FF9900, #FF6600)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              fontWeight: '700'
            }}>
              {item.step}
            </div>
            <p style={{ margin: '0 0 4px', fontWeight: '600' }}>{item.title}</p>
            <p style={{ margin: 0, fontSize: '12px', color: '#8b8b9b' }}>{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
