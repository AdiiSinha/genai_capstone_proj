const G = "https://graph.microsoft.com/v1.0";

async function req(token, path, options = {}) {
  const r = await fetch(G + path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await r.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!r.ok) throw Error(data?.error?.message || `Graph ${r.status}`);
  return data;
}

export const getProfile = token => req(
  token,
  "/me?$select=id,displayName,givenName,surname,mail,userPrincipalName,jobTitle,department,officeLocation,mobilePhone,businessPhones,preferredLanguage"
);

export const getMail = token => req(
  token,
  "/me/mailFolders/inbox/messages?$top=50&$orderby=receivedDateTime%20desc&$select=id,subject,from,receivedDateTime,bodyPreview,importance,isRead,hasAttachments,webLink,flag"
);

export const getCalendar = token => {
  const a = new Date();
  const b = new Date(Date.now() + 7 * 86400000);
  return req(
    token,
    `/me/calendarView?startDateTime=${encodeURIComponent(a.toISOString())}&endDateTime=${encodeURIComponent(b.toISOString())}&$top=50&$orderby=start/dateTime&$select=id,subject,start,end,location,organizer,isAllDay,webLink`
  );
};

export const sendMail = (token, x) => req(token, "/me/sendMail", {
  method: "POST",
  body: JSON.stringify({
    message: {
      subject: x.subject,
      body: { contentType: "Text", content: x.body },
      toRecipients: (x.to || "").split(/[;,]/).map(v => v.trim()).filter(Boolean).map(address => ({ emailAddress: { address } })),
      ccRecipients: (x.cc || "").split(/[;,]/).map(v => v.trim()).filter(Boolean).map(address => ({ emailAddress: { address } }))
    },
    saveToSentItems: true
  })
}).then(() => ({ success: true }));

export const createDraft = (token, x) => req(token, "/me/messages", {
  method: "POST",
  body: JSON.stringify({
    subject: x.subject,
    body: { contentType: "Text", content: x.body },
    toRecipients: (x.to || "").split(/[;,]/).map(v => v.trim()).filter(Boolean).map(address => ({ emailAddress: { address } })),
    ccRecipients: (x.cc || "").split(/[;,]/).map(v => v.trim()).filter(Boolean).map(address => ({ emailAddress: { address } }))
  })
});

export const markImportant = (token, id) => req(token, `/me/messages/${encodeURIComponent(id)}`, {
  method: "PATCH",
  body: JSON.stringify({ importance: "high" })
});

export const flagMail = (token, id) => req(token, `/me/messages/${encodeURIComponent(id)}`, {
  method: "PATCH",
  body: JSON.stringify({ flag: { flagStatus: "flagged" } })
});
