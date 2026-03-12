import React from 'react';

const SocialShareButtons = ({ url, title }) => {
  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    line: `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  };

  const buttonStyle = {
    margin: '5px',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    border: 'none',
    color: '#fff',
    fontWeight: 'bold'
  };

  return (
    <div className="share-buttons" style={{ display: 'flex', gap: '10px' }}>
      <button onClick={() => window.open(shareLinks.facebook, '_blank')} style={{ ...buttonStyle, backgroundColor: '#1877F2' }}>
        FB 分享
      </button>
      <button onClick={() => window.open(shareLinks.line, '_blank')} style={{ ...buttonStyle, backgroundColor: '#00B900' }}>
        LINE 分享
      </button>
      <button onClick={() => window.open(shareLinks.twitter, '_blank')} style={{ ...buttonStyle, backgroundColor: '#1DA1F2' }}>
        X 分享
      </button>
    </div>
  );
};

export default SocialShareButtons;
