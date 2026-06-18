"use client";

import React from 'react';

interface SupportForm {
  category: string;
  message: string;
}

interface ModalsProps {
  showSupportModal: boolean;
  setShowSupportModal: (show: boolean) => void;
  supportSuccess: boolean;
  setSupportSuccess: (success: boolean) => void;
  supportForm: SupportForm;
  setSupportForm: React.Dispatch<React.SetStateAction<SupportForm>>;
  isSubmittingSupport: boolean;
  setIsSubmittingSupport: (submitting: boolean) => void;
  faqOpenIndex: number | null;
  setFaqOpenIndex: (index: number | null) => void;
  showLogoutConfirm: boolean;
  setShowLogoutConfirm: (show: boolean) => void;
  setIsLoggedIn: (loggedIn: boolean) => void;
}

export default function Modals({
  showSupportModal,
  setShowSupportModal,
  supportSuccess,
  setSupportSuccess,
  supportForm,
  setSupportForm,
  isSubmittingSupport,
  setIsSubmittingSupport,
  faqOpenIndex,
  setFaqOpenIndex,
  showLogoutConfirm,
  setShowLogoutConfirm,
  setIsLoggedIn
}: ModalsProps) {

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingSupport(true);
    setTimeout(() => {
      setIsSubmittingSupport(false);
      setSupportSuccess(true);
    }, 1000);
  };

  return (
    <>
      {/* Support Help Center Modal */}
      {showSupportModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(6, 10, 22, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 9999,
            padding: '16px'
          }}
        >
          <div 
            style={{
              backgroundColor: '#121626',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '600px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              position: 'relative'
            }}
          >
            <button 
              onClick={() => {
                setShowSupportModal(false);
                setSupportSuccess(false);
                setSupportForm({ category: 'Technical Issue', message: '' });
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: '#c5c5d9',
                cursor: 'pointer'
              }}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <span className="material-symbols-outlined" style={{ color: '#bdc2ff', fontSize: '24px' }}>help_center</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#dae2fd' }}>Support & Help Center</h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#c5c5d9' }}>Resolve platform issues and submit tickets</p>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '8px' }}>
              {/* FAQ Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Frequently Asked Questions</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '280px', paddingRight: '4px' }}>
                  {[
                    {
                      q: "How is congestion score calculated?",
                      a: "It is estimated from dataset-derived hotspot severity and configurable traffic-impact assumptions."
                    },
                    {
                      q: "How can I export CSV reports?",
                      a: "Choose the timeframe and district in the Command Center tab filters, then click the 'Export Report' button at the bottom of the sidebar."
                    },
                    {
                      q: "How does the dispatch routing work?",
                      a: "Targets are ranked by reported violation count, location criticality, and estimated response time."
                    }
                  ].map((faq, idx) => (
                    <div key={idx} style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                      <button 
                        onClick={() => setFaqOpenIndex(faqOpenIndex === idx ? null : idx)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          color: '#dae2fd',
                          background: 'none',
                          border: 'none',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ flex: 1 }}>{faq.q}</span>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', transform: faqOpenIndex === idx ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>expand_more</span>
                      </button>
                      {faqOpenIndex === idx && (
                        <div style={{ padding: '0 12px 10px 12px', fontSize: '11px', color: '#c5c5d9', lineHeight: '1.4', backgroundColor: 'rgba(0,0,0,0.1)' }}>
                          {faq.a}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Ticket Form Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '1px solid rgba(255, 255, 255, 0.1)', paddingLeft: '24px' }}>
                <h4 style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Submit a Support Ticket</h4>
                
                {supportSuccess ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '16px', backgroundColor: 'rgba(62, 82, 255, 0.1)', borderRadius: '12px', border: '1px solid rgba(62, 82, 255, 0.2)' }}>
                    <span className="material-symbols-outlined animate-bounce" style={{ fontSize: '36px', color: '#bdc2ff', marginBottom: '8px' }}>check_circle</span>
                    <h5 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#dae2fd' }}>Ticket Submitted</h5>
                    <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#c5c5d9' }}>We will review your inquiry and get back to you within 24 hours.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSupportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase' }}>Category</label>
                      <select 
                        value={supportForm.category}
                        onChange={(e) => setSupportForm({ ...supportForm, category: e.target.value })}
                        style={{
                          width: '100%',
                          backgroundColor: 'rgba(0,0,0,0.4)',
                          border: '1px solid #444656',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          color: '#dae2fd',
                          fontSize: '12px',
                          outline: 'none'
                        }}
                      >
                        <option value="Technical Issue">Technical Issue</option>
                        <option value="Data Discrepancy">Data Discrepancy</option>
                        <option value="Feature Request">Feature Request</option>
                        <option value="Account Settings">Account Settings</option>
                      </select>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase' }}>Description</label>
                      <textarea 
                        value={supportForm.message}
                        onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                        required
                        rows={4}
                        placeholder="Describe your issue..."
                        style={{
                          width: '100%',
                          backgroundColor: 'rgba(0,0,0,0.4)',
                          border: '1px solid #444656',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          color: '#dae2fd',
                          fontSize: '12px',
                          outline: 'none',
                          resize: 'none'
                        }}
                      />
                    </div>
                    
                    <button 
                      type="submit"
                      disabled={isSubmittingSupport}
                      style={{
                        width: '100%',
                        backgroundColor: '#bdc2ff',
                        color: '#00149e',
                        fontWeight: 'bold',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      {isSubmittingSupport ? (
                        <>
                          <span className="material-symbols-outlined animate-spin" style={{ fontSize: '16px' }}>sync</span>
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>send</span>
                          <span>Submit Ticket</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(6, 10, 22, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 9999,
            padding: '16px'
          }}
        >
          <div 
            style={{
              backgroundColor: '#121626',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '380px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              textAlign: 'center'
            }}
          >
            <div 
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 180, 171, 0.15)',
                color: '#ffb4ab',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>logout</span>
            </div>
            
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#dae2fd' }}>Confirm Log Out</h3>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#c5c5d9', lineHeight: '1.4' }}>Are you sure you want to end your current session? You will need to log back in to access the command center.</p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  width: '100%',
                  border: '1px solid #444656',
                  backgroundColor: 'transparent',
                  color: '#dae2fd',
                  fontWeight: 'bold',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowLogoutConfirm(false);
                  setIsLoggedIn(false);
                }}
                style={{
                  width: '100%',
                  backgroundColor: '#ffb4ab',
                  color: '#690005',
                  fontWeight: 'bold',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: 'none'
                }}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
