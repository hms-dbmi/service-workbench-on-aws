// List of terms, newest to oldest
export default [
  {
    date: '2023-01-04T18:55:16.243Z',
    fields: {
      // Fields that should get replaced in terms template
      organization: 'Harvard Medical School',
      contact: 'Samantha.Piatt@childrens.harvard.edu',
      xxx: '',
    },
    // TODO: Replace {XXX}
    terms: `
      <p>
        These Terms of Service constitute a legally binding agreement made between 
        you, whether personally or on behalf of an entity ("you", "your") and 
        {ORGANIZATION} ("University", "we", "our"), concerning your access to and use 
        of Service Workbench. You agree to access and use Service Workbench for 
        lawful purposes only. You are solely responsible for the knowledge of and 
        adherence to any and all laws, statutes, rules, and regulations pertaining 
        to your use of Service Workbench. By accessing ServiceWorkbench, you 
        expressly consent to monitoring of your actions and all content or data 
        transiting or stored therein.
      </p>
      <b>By accessing and using Service Workbench, you agree that you must:</b>
      <ul>
        <li>Conduct only authorized business on the system.</li>
        <li>
          Maintain the confidentiality of your authentication credentials such as 
          your password. Do not reveal your authentication credentials to anyone; 
          an University employee should never ask you to reveal them. 
        </li>
        <li>
          Follow proper logon/logoff procedures. You must manually logon to your 
          session; do not store your password locally on your system or utilize 
          any automated logon capabilities. You must promptly log off when session 
          access is no longer needed. If a logoff function is unavailable, you 
          must close your browser. Never leave your computer unattended while 
          logged into the system.
        </li>
        <li>
          Access Service Workbench using only your own individual account. Group 
          or shared accounts are NOT permitted. The credentials used for 
          authenticating to Service Workbench must belong to a single individual. 
          Your level of access to systems and networks owned by the University is 
          limited to ensure your access is no more than necessary to perform your 
          legitimate tasks or assigned duties. If you believe you are being 
          granted access that you should not have, you must immediately notify 
          <a href="mailto:{CONTACT}">{CONTACT}</a>.
        </li>
        <li>
          Safeguard system resources against waste, loss, abuse, unauthorized use 
          or disclosure, and misappropriation.
        </li>
        <li>
          Report all security incidents or suspected incidents (e.g., lost 
          passwords, improper or suspicious acts) related to Service Workbench 
          <a href="mailto:{CONTACT}">{CONTACT}</a>.
        </li>
        <li>
          Contact <a href="mailto:{CONTACT}">{CONTACT}</a> if you do not understand any of these rules. 
        </li>
      </ul>

      <b>By agreeing to the Terms of Service you understand and agree to the 
        following:</b>
      <ul>
        <li>
          If the University provides links that are maintained or controlled by 
          external organizations, the listing of links are not an endorsement of 
          information, products, or services, and do not imply a direct 
          association between the University and the operators of the outside 
          resource links.
        </li>
        <li>
          Neither the University nor its employees warrant that Service Workbench 
          will be uninterrupted, problem-free, free of omissions, or error-free; 
          nor do they make any warranty as to the results that may be obtained 
          from Service Workbench. You expressly understand and agree that your use 
          of Service Workbench, or any material available through it, is at your 
          own risk.
        </li>
        <li>
          In no event will the University, its affiliates or participating 
          institutions, or their respective directors, officers, employees, 
          faculty members or students be liable for any damages, include 
          incidental, indirect, special, punitive, exemplary, or consequential 
          damages, arising out of your use of or inability to use of Service 
          Workbench, including without limitation, loss of revenue or anticipated 
          profits, loss of goodwill, loss of data, computer failure or 
          malfunction, or any and all other damages.
        </li>
        <li>
          The University maintains the right to modify these Terms of Service at 
          any time, and may do so by posting notice of such modifications to 
          {XXX}. Any modification made is effective immediately upon posting the 
          modification (unless otherwise stated). You should visit this page 
          periodically to review the current Terms of Service.
        </li>
        <li>
          Upload of any data in your workspace is under your responsibility. Any 
          loss of data will not be the University's responsibility.
        </li>
        <li>
          The University may in our sole discretion suspend/terminate your access 
          to ServiceWorkbench without notification. We reserve the right to 
          delete, move, or edit any data, which we consider to be unacceptable or 
          inappropriate. We may also periodically review and remove accounts for 
          which a user has not logged on.
        </li>
      </ul>

      <b>By accessing and using Service Workbench, you agree that you must NOT:</b>
      <ul>
        <li>
          Use Service Workbench to commit a criminal offense or engage in 
          inappropriate or malicious behavior, or to encourage others to conduct 
          acts that would constitute a criminal offense or give rise to civil 
          liability.
        </li>
        <li>
          Process U.S. classified national security information on the system. 
        </li>
        <li>
          Browse, search or reveal any protected data except in accordance with 
          that which is required to perform your legitimate tasks or assigned 
          duties.
        </li>
        <li>
          Retrieve protected data or information, or in any other way disclose 
          information, for someone who does not have authority to access that 
          information.
        </li>
        <li>
          Establish any unauthorized interfaces between systems, networks, and 
          applications owned by the University.
        </li>
        <li>
          Upload any content that contains a software virus, such as a Trojan 
          Horse or any other computer codes, files, or programs that may alter, 
          damage, or interrupt the daily function of Service Workbench and its 
          users.
        </li>
        <li>
          Post any material that infringes or violates the academic/intellectual 
          rights of others.
        </li>
        <li>
          View or use the controlled access data hosted on Service Workbench 
          unless you are authorized.
        </li>
        <li>
          Share or distribute access data hosted on Service Workbench with other 
          users unless they have authorization.
        </li>
        <li>
          Use Service Workbench to generate, distribute, publish, or facilitate 
          unsolicited mass email, promotions, advertisings or other solicitations 
          or mine for cryptocurrency.
        </li>
        <li>Name workspaces inappropriately or with sensitive information.</li>
      </ul>

      <h3>
        Service Workbench is hosted on a FISMA (Federal Information Security 
        Management Act) website.
      </h3>
      <p>
        You are accessing a secure and restricted system that is provided for 
        FISMA authorized use only.
      </p>

      <b>By using this System, you consent to the following conditions:</b>
      <ul>
        <li>
          {ORGANIZATION}, for their FISMA service, routinely intercepts and monitors 
          communications on this System for purposes including, but not limited 
          to, penetration testing, COMSEC monitoring, network operations and 
          defense, and/or personnel misconduct (PM).
        </li>
        <li>
          At any time, the {ORGANIZATION} FISMA service and systems may inspect and 
          seize data stored on this platform.
        </li>
        <li>
          Communications using, or data stored on, this platform are not private, 
          are subject to routine monitoring, interception, and search, and may be 
          disclosed or used for any {ORGANIZATION} FISMA service authorized purpose. 
        </li>
        <li>
          This {ORGANIZATION} FISMA system includes security measures (e.g., 
          authentication and Access Controls) to protect {ORGANIZATION} 
          interests--not for your personal benefit or privacy. 
        </li>
        <li>
          Notwithstanding the above, using this {ORGANIZATION} FISMA service does not 
          constitute consent to searching or monitoring of the content of 
          privileged communications, or work product, related to personal 
          representation or services by attorneys, psychotherapists, or clergy, 
          and their assistants. Such communications and work product are private 
          and confidential.
        </li>
      </ul>
    `,
  },
];
